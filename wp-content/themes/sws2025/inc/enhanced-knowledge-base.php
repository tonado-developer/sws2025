<?php

/**
 * Enhanced WordPress Knowledge Base mit Atlassian Integration
 * - Bulk Embedding Processing
 * - WP-Cron Batch Processing  
 * - Real-time Progress Tracking
 * - MySQL Vector Performance Optimization
 * 
 * Installation: In functions.php includen:
 * require_once get_template_directory() . '/enhanced-knowledge-base.php';
 */

if (!defined('ABSPATH')) {
    exit;
}

class Enhanced_WP_Knowledge_Base
{
    private $table_name;
    private $openai_api_key;
    private $atlassian_api_key;
    private $atlassian_email;
    private $atlassian_base_url;
    private $options;
    private $debug_log = [];

    public function __construct(array $options = [])
    {
        $this->options = array_merge([
            "debug" => true,
            "batch_size" => 10,
            "embedding_chunk_size" => 20,
            "atlassian_rate_limit" => 2, // Sekunden zwischen API Calls
            "openai_rate_limit" => 1
        ], $options);

        global $wpdb;
        $this->table_name = $wpdb->prefix . 'knowledge_base';

        // API Keys
        $this->openai_api_key = get_option('kb_openai_key', '');
        $this->atlassian_base_url = get_option('kb_atlassian_base_url', 'https://swspedia.atlassian.net/wiki');

        // WordPress Hooks
        add_action('init', [$this, 'init']);
        add_action('admin_menu', [$this, 'admin_menu']);

        // AJAX Handlers
        add_action('wp_ajax_kb_start_atlassian_indexing', [$this, 'start_atlassian_indexing']);
        add_action('wp_ajax_kb_index_wordpress', [$this, 'index_wordpress_content']);
        add_action('wp_ajax_kb_process_embeddings', [$this, 'manual_process_embeddings']);
        add_action('wp_ajax_kb_get_progress', [$this, 'get_indexing_progress']);
        add_action('wp_ajax_kb_cancel_indexing', [$this, 'cancel_indexing']);
        add_action('wp_ajax_kb_optimize_database', [$this, 'optimize_database']);
        add_action('wp_ajax_kb_test_search', [$this, 'test_search']);

        // WP-Cron Actions
        add_action('kb_process_atlassian_batch', [$this, 'process_atlassian_batch'], 10, 2);
        add_action('kb_process_embedding_batch', [$this, 'process_embedding_batch'], 10, 1);

        // Enhanced AI Engine Integration
        add_filter('mwai_ai_query', [$this, 'enhance_ai_query'], 5, 1);

        // Auto-Update für WordPress Content
        add_action('save_post', [$this, 'auto_update_post'], 10, 3);
        add_action('delete_post', [$this, 'auto_delete_post']);
    }

    public function init()
    {
        if (get_option('kb_table_created') !== '3' || !$this->table_exists()) {
            $this->create_optimized_table();
        }
    }

    /**
     * Erstelle optimierte Tabelle mit Vector Performance Features
     */
    public function create_optimized_table()
    {
        global $wpdb;

        $charset_collate = $wpdb->get_charset_collate();

        // In create_optimized_table() - ENTFERNE embedding_norm komplett
        $sql = "CREATE TABLE IF NOT EXISTS {$this->table_name} (
            id int(11) NOT NULL AUTO_INCREMENT,
            content longtext NOT NULL,
            embedding longtext NOT NULL,
            source varchar(255) DEFAULT '',
            content_type varchar(50) DEFAULT '',
            content_id int(11) DEFAULT NULL,
            atlassian_page_id varchar(20) DEFAULT NULL,
            created_at timestamp DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            INDEX idx_content_type (content_type),
            INDEX idx_source (source),
            INDEX idx_atlassian_page (atlassian_page_id),
            FULLTEXT idx_content (content)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);

        // MySQL Performance Optimierung
        $this->optimize_mysql_config();

        if ($this->table_exists()) {
            update_option('kb_table_created', '3');
            $this->debug("Enhanced Knowledge Base table created with performance optimizations");
        }
    }

    public function manual_process_embeddings()
    {
        if (!wp_verify_nonce($_POST['nonce'], 'kb_nonce')) {
            wp_send_json_error(['message' => 'Security check failed']);
        }

        global $wpdb;

        // Items ohne Embeddings zählen
        $missing = $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name} WHERE embedding = '[]'");

        if ($missing == 0) {
            wp_send_json_success(['message' => 'Keine fehlenden Embeddings', 'more' => false]);
        }

        // Batch von 20 Items
        $items = $wpdb->get_results("
            SELECT id, content 
            FROM {$this->table_name} 
            WHERE embedding = '[]' 
            LIMIT 20
        ");

        // Bulk Embeddings
        $contents = array_column($items, 'content');
        $embeddings = $this->get_bulk_openai_embeddings($contents);

        if ($embeddings) {
            foreach ($items as $index => $item) {
                $wpdb->update(
                    $this->table_name,
                    ['embedding' => json_encode($embeddings[$index])],
                    ['id' => $item->id]
                );
            }
        }

        $remaining = $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name} WHERE embedding = '[]'");

        wp_send_json_success([
            'message' => "Processed: " . count($items) . ", Remaining: $remaining",
            'more' => $remaining > 0
        ]);
    }

    /**
     * MySQL Performance Optimierung
     */
    private function optimize_mysql_config()
    {
        global $wpdb;

        // InnoDB Buffer Pool (falls möglich)
        $memory_info = $this->get_server_memory();
        if ($memory_info['available_mb'] > 2048) {
            $buffer_size = min(intval($memory_info['available_mb'] * 0.6), 4096);
            $wpdb->query("SET GLOBAL innodb_buffer_pool_size = {$buffer_size}M");
        }

        // Query optimizations
        $wpdb->query("SET SESSION sort_buffer_size = 4194304"); // 4MB
        $wpdb->query("SET SESSION tmp_table_size = 268435456"); // 256MB

        $this->debug("MySQL performance optimization applied");
    }

    /**
     * Admin Interface
     */
    public function admin_menu()
    {
        add_options_page(
            'Enhanced Knowledge Base',
            'Enhanced Knowledge Base',
            'manage_options',
            'enhanced-knowledge-base',
            [$this, 'admin_page']
        );
    }

    public function admin_page()
    {
        // Settings speichern
        if ($_POST['save_settings'] ?? null) {
            update_option('kb_openai_key', sanitize_text_field($_POST['openai_key']));
            update_option('kb_atlassian_base_url', esc_url_raw($_POST['atlassian_base_url']));

            $this->openai_api_key = $_POST['openai_key'];
            $this->atlassian_base_url = $_POST['atlassian_base_url'];

            echo '<div class="notice notice-success"><p>✅ Einstellungen gespeichert!</p></div>';
        }

        // Status abrufen
        global $wpdb;
        $table_exists = $this->table_exists();
        $total_count = $table_exists ? $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name}") : 0;
        $atlassian_count = $table_exists ? $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name} WHERE content_type = 'atlassian'") : 0;
        $wordpress_count = $table_exists ? $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name} WHERE content_type IN ('page', 'post')") : 0;

        $progress = get_option('kb_indexing_progress');
        $is_processing = $progress && $progress['status'] === 'processing';

?>
        <div class="wrap">
            <h1>🚀 Enhanced Knowledge Base</h1>

            <!-- Status Dashboard -->
            <div class="kb-status-dashboard" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0;">

                <div class="kb-stat-card" style="background: #fff; padding: 20px; border-left: 4px solid #0073aa; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 10px 0; color: #0073aa;">📊 Datenbank Status</h3>
                    <p><strong>Tabelle:</strong> <?= $table_exists ? '✅ Existiert' : '❌ Fehlt' ?></p>
                    <p><strong>Gesamt Chunks:</strong> <?= number_format($total_count) ?></p>
                    <p><strong>Atlassian:</strong> <?= number_format($atlassian_count) ?></p>
                    <p><strong>WordPress:</strong> <?= number_format($wordpress_count) ?></p>
                </div>

                <div class="kb-stat-card" style="background: #fff; padding: 20px; border-left: 4px solid #00a32a; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 10px 0; color: #00a32a;">🔑 API Status</h3>
                    <p><strong>OpenAI:</strong> <?= $this->openai_api_key ? '✅ Konfiguriert' : '❌ Fehlt' ?></p>
                    <p><strong>Atlassian URL:</strong> <?= $this->atlassian_base_url ? '✅ Set' : '❌ Fehlt' ?></p>
                    <p><strong>Zugriff:</strong> Öffentlich</p>
                </div>

                <div class="kb-stat-card" style="background: #fff; padding: 20px; border-left: 4px solid #ff9800; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 10px 0; color: #ff9800;">⚡ Performance</h3>
                    <?php
                    $perf_stats = $this->get_performance_stats();
                    echo "<p><strong>Ø Query Zeit:</strong> {$perf_stats['avg_query_time']}ms</p>";
                    echo "<p><strong>RAM Usage:</strong> {$perf_stats['memory_usage']}MB</p>";
                    echo "<p><strong>Buffer Pool:</strong> {$perf_stats['buffer_pool_status']}</p>";
                    ?>
                </div>
            </div>

            <!-- Progress Section -->
            <?php if ($is_processing): ?>
                <div class="kb-progress-section" style="background: #fff8e1; border: 1px solid #ffcc02; padding: 20px; margin: 20px 0; border-radius: 5px;">
                    <h3>🔄 Indexierung läuft...</h3>
                    <div class="kb-progress-bar" style="background: #f0f0f0; height: 20px; border-radius: 10px; overflow: hidden; margin: 10px 0;">
                        <div id="progress-fill" style="background: linear-gradient(45deg, #4CAF50, #45a049); height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                    </div>
                    <div id="progress-info">
                        <p id="progress-text">Initialisierung...</p>
                        <p id="progress-details" style="font-size: 12px; color: #666;"></p>
                    </div>
                    <button id="cancel-indexing" class="button button-secondary" style="margin-top: 10px;">❌ Abbrechen</button>
                </div>
            <?php endif; ?>

            <!-- API Settings -->
            <div class="kb-settings-section" style="background: #fff; padding: 20px; margin: 20px 0; border: 1px solid #ddd;">
                <h3>🔧 API Einstellungen</h3>
                <form method="post">
                    <table class="form-table">
                        <tr>
                            <th>OpenAI API Key</th>
                            <td>
                                <input type="password" name="openai_key" value="<?= esc_attr($this->openai_api_key) ?>" style="width: 400px;" placeholder="sk-...">
                                <p class="description">Von <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com</a></p>
                            </td>
                        </tr>
                        <tr>
                            <th>Atlassian Base URL</th>
                            <td>
                                <input type="url" name="atlassian_base_url" value="<?= esc_attr($this->atlassian_base_url) ?>" style="width: 400px;">
                                <p class="description">z.B. https://company.atlassian.net/wiki (öffentlich zugänglich)</p>
                            </td>
                        </tr>
                    </table>
                    <input type="submit" name="save_settings" class="button-primary" value="💾 Speichern">
                </form>
            </div>

            <!-- Actions -->
            <div class="kb-actions-section" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0;">

                <div class="kb-action-card" style="background: #fff; padding: 20px; border: 1px solid #ddd;">
                    <h3>🏗️ Atlassian Indexierung</h3>
                    <p>Alle Seiten aus dem Atlassian Wiki indexieren (~2700 Seiten)</p>
                    <p><strong>Geschätzte Zeit:</strong> 30-45 Minuten</p>
                    <p><strong>Kosten:</strong> ~$0.026 (2.6 Cent)</p>
                    <button id="start-atlassian-indexing" class="button-primary" <?= $is_processing ? 'disabled' : '' ?>>
                        🚀 Atlassian indexieren
                    </button>
                    <div id="atlassian-status" style="margin-top: 10px;"></div>
                </div>

                <div class="kb-action-card" style="background: #fff; padding: 20px; border: 1px solid #ddd;">
                    <h3>🔧 WordPress Indexierung</h3>
                    <p>Alle WordPress Pages/Posts neu indexieren</p>
                    <button id="index-wordpress" class="button-secondary">📝 WordPress indexieren</button>
                    <div id="wordpress-status" style="margin-top: 10px;"></div>
                </div>

                <div class="kb-action-card" style="background: #fff; padding: 20px; border: 1px solid #ddd;">
                    <h3>🧠 Embeddings generieren</h3>
                    <p>Fehlende Embeddings für gespeicherte Inhalte generieren</p>
                    <button id="process-embeddings" class="button-secondary">🚀 Embeddings starten</button>
                    <div id="embeddings-status" style="margin-top: 10px;"></div>
                </div>

                <div class="kb-action-card" style="background: #fff; padding: 20px; border: 1px solid #ddd;">
                    <h3>⚡ Performance Optimierung</h3>
                    <p>MySQL Datenbank für Vector Search optimieren</p>
                    <button id="optimize-database" class="button-secondary">🚀 Optimieren</button>
                    <div id="optimize-status" style="margin-top: 10px;"></div>
                </div>

            </div>

            <!-- Test Search -->
            <div class="kb-test-section" style="background: #fff; padding: 20px; margin: 20px 0; border: 1px solid #ddd;">
                <h3>🔍 Knowledge Base testen</h3>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <input type="text" id="test-query" placeholder="Frage eingeben..." style="flex: 1; padding: 8px;">
                    <button id="test-search" class="button">🔍 Suchen</button>
                </div>
                <div id="test-results" style="margin-top: 15px;"></div>
            </div>
        </div>

        <script>
            jQuery(document).ready(function($) {
                const nonce = '<?= wp_create_nonce('kb_nonce') ?>';
                let progressInterval;

                // WordPress Indexing
                $('#index-wordpress').on('click', function() {
                    $(this).prop('disabled', true).text('🔄 Indexiert...');
                    $('#wordpress-status').html('🔄 WordPress Inhalte werden indexiert...');

                    $.post(ajaxurl, {
                        action: 'kb_index_wordpress',
                        nonce: nonce
                    }, function(response) {
                        $('#wordpress-status').html(response.success ? '✅ ' + response.data.message : '❌ ' + response.data.message);
                        $('#index-wordpress').prop('disabled', false).text('📝 WordPress indexieren');
                    });
                });

                // Process Embeddings
                $('#process-embeddings').on('click', function() {
                    $(this).prop('disabled', true).text('🔄 Verarbeitet...');
                    $('#embeddings-status').html('🔄 Embeddings werden generiert...');

                    $.post(ajaxurl, {
                        action: 'kb_process_embeddings',
                        nonce: nonce
                    }, function(response) {
                        $('#embeddings-status').html(response.success ? '✅ ' + response.data.message : '❌ ' + response.data.message);
                        $('#process-embeddings').prop('disabled', false).text('🚀 Embeddings starten');

                        if (response.success && response.data.more) {
                            // Automatisch nächsten Batch nach 3 Sekunden
                            setTimeout(() => $('#process-embeddings').click(), 3000);
                        }
                    });
                });

                // Start Atlassian Indexing
                $('#start-atlassian-indexing').on('click', function() {
                    const directMode = confirm('Direct Mode (blockiert Browser) oder Background Mode?');

                    $.post(ajaxurl, {
                        action: 'kb_start_atlassian_indexing',
                        nonce: nonce,
                        direct: directMode ? 'true' : 'false'
                    }, function(response) {
                        if (response.data && response.data.debug) {
                            console.log('Debug Log:', response.data.debug);
                        }
                        // ...
                    });
                });

                // Progress Tracking
                <?php if ($is_processing): ?>
                    progressInterval = setInterval(updateProgress, 3000);
                    updateProgress(); // Initial load
                <?php endif; ?>

                function updateProgress() {
                    $.post(ajaxurl, {
                        action: 'kb_get_progress',
                        nonce: nonce
                    }, function(data) {
                        if (data.success) {
                            const progress = data.data;
                            const percent = Math.round((progress.processed / progress.total) * 100);

                            $('#progress-fill').css('width', percent + '%');
                            $('#progress-text').text(progress.message + ' (' + percent + '%)');
                            $('#progress-details').text(
                                `${progress.processed}/${progress.total} Seiten | ` +
                                `Batch ${progress.current_batch} | ` +
                                `Geschätzte Restzeit: ${progress.estimated_remaining || 'berechne...'}`
                            );

                            if (progress.status === 'completed') {
                                clearInterval(progressInterval);
                                setTimeout(() => location.reload(), 2000);
                            } else if (progress.status === 'error') {
                                clearInterval(progressInterval);
                                $('#progress-text').text('❌ ' + progress.message);
                            }
                        }
                    });
                }

                // Cancel Indexing
                $('#cancel-indexing').on('click', function() {
                    if (!confirm('Indexierung wirklich abbrechen?')) return;

                    $.post(ajaxurl, {
                        action: 'kb_cancel_indexing',
                        nonce: nonce
                    }, function(response) {
                        if (response.success) {
                            clearInterval(progressInterval);
                            location.reload();
                        }
                    });
                });

                // Database Optimization
                $('#optimize-database').on('click', function() {
                    $(this).prop('disabled', true).text('🔄 Optimiert...');
                    $('#optimize-status').html('🔄 Datenbank wird optimiert...');

                    $.post(ajaxurl, {
                        action: 'kb_optimize_database',
                        nonce: nonce
                    }, function(response) {
                        $('#optimize-status').html(response.success ? '✅ ' + response.data.message : '❌ ' + response.data.message);
                        $('#optimize-database').prop('disabled', false).text('🚀 Optimieren');
                    });
                });

                // Test Search
                $('#test-search').on('click', function() {
                    const query = $('#test-query').val();
                    if (!query) return;

                    $('#test-results').html('🔄 Suche läuft...');

                    $.post(ajaxurl, {
                        action: 'kb_test_search',
                        query: query,
                        nonce: nonce
                    }, function(response) {
                        $('#test-results').html(response);
                    });
                });
            });
        </script>

        <style>
            .kb-progress-bar {
                position: relative;
                overflow: hidden;
            }

            .kb-progress-bar::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                bottom: 0;
                right: 0;
                background-image: linear-gradient(45deg,
                        rgba(255, 255, 255, 0.2) 25%,
                        transparent 25%,
                        transparent 50%,
                        rgba(255, 255, 255, 0.2) 50%,
                        rgba(255, 255, 255, 0.2) 75%,
                        transparent 75%,
                        transparent);
                background-size: 50px 50px;
                animation: progress-bar-stripes 1s linear infinite;
            }

            @keyframes progress-bar-stripes {
                from {
                    background-position: 50px 0;
                }

                to {
                    background-position: 0 0;
                }
            }
        </style>
<?php
    }

    /**
     * Atlassian Indexierung starten
     */
    public function start_atlassian_indexing()
    {
        $this->debug("=== START ATLASSIAN INDEXING ===");

        if (!wp_verify_nonce($_POST['nonce'], 'kb_nonce')) {
            wp_send_json_error(['message' => 'Security check failed']);
        }

        // Direkt testen ob API erreichbar ist
        $test_response = $this->test_atlassian_connection();
        if (!$test_response['success']) {
            $this->debug("Atlassian connection failed", $test_response);
            wp_send_json_error([
                'message' => 'Atlassian API nicht erreichbar: ' . $test_response['error'],
                'debug' => $this->debug_log
            ]);
        }

        // Progress initialisieren
        update_option('kb_indexing_progress', [
            'total' => 0,
            'processed' => 0,
            'status' => 'initializing',
            'message' => 'Teste Atlassian Verbindung...'
        ]);

        // DIREKT ausführen statt WP-Cron (für Debug)
        if (isset($_POST['direct']) && $_POST['direct'] === 'true') {
            $this->debug("Running DIRECT indexing (no cron)");
            $this->process_atlassian_batch(0, true);
            wp_send_json_success(['message' => 'Direct indexing started', 'debug' => $this->debug_log]);
        } else {
            wp_schedule_single_event(time() + 2, 'kb_process_atlassian_batch', [0, true]);
            wp_send_json_success(['message' => 'Cron indexing scheduled']);
        }
    }

    private function test_atlassian_connection()
    {
        $url = $this->atlassian_base_url . "/rest/api/content?limit=1";
        $this->debug("Testing Atlassian URL: $url");

        // Mit Authentication wenn vorhanden
        $args = ['timeout' => 10];

        // Falls Credentials gesetzt sind
        $atlassian_email = get_option('kb_atlassian_email');
        $atlassian_token = get_option('kb_atlassian_token');

        if ($atlassian_email && $atlassian_token) {
            $args['headers'] = [
                'Authorization' => 'Basic ' . base64_encode("$atlassian_email:$atlassian_token")
            ];
            $this->debug("Using Atlassian Auth");
        }

        $response = wp_remote_get($url, $args);

        if (is_wp_error($response)) {
            return ['success' => false, 'error' => $response->get_error_message()];
        }

        $code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);

        $this->debug("Atlassian Response Code: $code");

        if ($code === 401) {
            return ['success' => false, 'error' => 'Authentication required'];
        }

        if ($code !== 200) {
            return ['success' => false, 'error' => "HTTP $code: " . substr($body, 0, 200)];
        }

        return ['success' => true];
    }

    /**
     * Atlassian Batch verarbeiten
     */
    public function process_atlassian_batch($start_index, $is_first_batch = false)
    {
        $this->debug("Processing Atlassian batch starting at index: $start_index");

        $progress = get_option('kb_indexing_progress', []);

        try {
            if ($is_first_batch) {
                // Alle Seiten abrufen um total zu ermitteln
                $all_pages = $this->fetch_all_atlassian_pages();

                $progress['total'] = count($all_pages);
                $progress['status'] = 'processing';
                $progress['phase'] = 'processing_content';
                $progress['all_pages'] = $all_pages; // Für spätere Batches

                update_option('kb_indexing_progress', $progress);
                $this->debug("Fetched {$progress['total']} pages from Atlassian");
            } else {
                $all_pages = $progress['all_pages'] ?? [];
            }

            if (empty($all_pages)) {
                $this->finish_indexing('error', 'Keine Seiten von Atlassian erhalten');
                return;
            }

            // Batch Processing
            $batch_size = $this->options['batch_size'];
            $batch_pages = array_slice($all_pages, $start_index, $batch_size);

            if (empty($batch_pages)) {
                // Alle Seiten verarbeitet - zu Embedding Phase
                $this->start_embedding_phase();
                return;
            }

            // Bestehende Atlassian Inhalte für diese Seiten löschen
            $this->cleanup_atlassian_content($batch_pages);

            // Content zu Knowledge Base hinzufügen (ohne Embeddings)
            $processed_count = 0;
            foreach ($batch_pages as $page) {
                if ($this->store_atlassian_page_content($page)) {
                    $processed_count++;
                }

                // Rate limiting
                sleep($this->options['atlassian_rate_limit']);
            }

            // Progress updaten
            $progress['processed'] = $start_index + $processed_count;
            $progress['current_batch'] = intval($start_index / $batch_size) + 1;
            $progress['message'] = "Verarbeite Atlassian Inhalte... ({$progress['processed']}/{$progress['total']})";
            $progress['estimated_remaining'] = $this->calculate_remaining_time($progress);

            update_option('kb_indexing_progress', $progress);

            // Nächsten Batch schedulen
            wp_schedule_single_event(time() + 10, 'kb_process_atlassian_batch', [$start_index + $batch_size, false]);

            $this->debug("Processed batch: $processed_count pages, next batch: " . ($start_index + $batch_size));
        } catch (Exception $e) {
            $this->debug("Error in process_atlassian_batch: " . $e->getMessage());
            $this->finish_indexing('error', 'Fehler beim Verarbeiten: ' . $e->getMessage());
        }
    }

    /**
     * Alle Atlassian Seiten abrufen
     */
    private function fetch_all_atlassian_pages()
    {
        $this->debug("=== FETCHING ALL ATLASSIAN PAGES ===");

        $all_pages = [];
        $start = 0;
        $limit = 25;
        $max_iterations = 200; // Safety limit
        $iteration = 0;

        // Auth Setup
        $headers = [];
        $atlassian_email = get_option('kb_atlassian_email');
        $atlassian_token = get_option('kb_atlassian_token');

        if ($atlassian_email && $atlassian_token) {
            $headers['Authorization'] = 'Basic ' . base64_encode("$atlassian_email:$atlassian_token");
        }

        do {
            $iteration++;
            $url = $this->atlassian_base_url . "/rest/api/content?expand=body.storage,space&limit=$limit&start=$start";

            $this->debug("Fetching batch $iteration from: $url");

            $response = wp_remote_get($url, [
                'timeout' => 30,
                'headers' => $headers
            ]);

            if (is_wp_error($response)) {
                $this->debug("API Error", $response->get_error_message());
                throw new Exception('Atlassian API Error: ' . $response->get_error_message());
            }

            $body = wp_remote_retrieve_body($response);
            $data = json_decode($body, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                $this->debug("JSON Decode Error", ['error' => json_last_error_msg(), 'body' => substr($body, 0, 500)]);
                throw new Exception('Invalid JSON response from Atlassian');
            }

            if (!isset($data['results'])) {
                $this->debug("No results in response", $data);
                break;
            }

            $count = count($data['results']);
            $this->debug("Got $count pages in batch $iteration");

            $all_pages = array_merge($all_pages, $data['results']);
            $start += $limit;

            sleep($this->options['atlassian_rate_limit']);
        } while (!empty($data['results']) && $iteration < $max_iterations);

        $this->debug("Total pages fetched: " . count($all_pages));

        return $all_pages;
    }

    /**
     * Atlassian Seiten Content speichern (ohne Embeddings)
     */
    private function store_atlassian_page_content($page)
    {
        global $wpdb;

        $title = $page['title'] ?? 'Untitled';
        $content = $this->extract_content_from_atlassian_page($page);
        $page_id = $page['id'] ?? '';
        $space_key = $page['space']['key'] ?? '';

        if (strlen($content) < 50) {
            $this->debug("Skipping page '{$title}' - content too short");
            return false;
        }

        // Content in Chunks aufteilen
        $chunks = $this->create_content_chunks($content, $title);

        foreach ($chunks as $chunk) {
            $wpdb->insert($this->table_name, [
                'content' => $chunk,
                'embedding' => '[]', // Placeholder - wird später gefüllt
                'source' => "atlassian_{$space_key}_{$page_id}",
                'content_type' => 'atlassian',
                'atlassian_page_id' => $page_id
            ]);
        }

        return true;
    }

    /**
     * Content aus Atlassian Seite extrahieren
     */
    private function extract_content_from_atlassian_page($page)
    {
        $content = $page['body']['storage']['value'] ?? '';

        // HTML/XML Tags entfernen
        $content = preg_replace('/<[^>]+>/', ' ', $content);

        // HTML Entities dekodieren
        $content = html_entity_decode($content, ENT_QUOTES, 'UTF-8');

        // Whitespace normalisieren
        $content = preg_replace('/\s+/', ' ', $content);

        // Titel mit einbeziehen
        $title = $page['title'] ?? '';
        if ($title) {
            $content = $title . "\n\n" . $content;
        }

        return trim($content);
    }

    /**
     * Content in Chunks aufteilen
     */
    private function create_content_chunks($content, $title = '')
    {
        $chunk_size = 800; // Größere Chunks für bessere Embeddings
        $overlap = 100; // Overlap für Kontext

        $chunks = [];
        $content_length = strlen($content);

        for ($i = 0; $i < $content_length; $i += ($chunk_size - $overlap)) {
            $chunk = substr($content, $i, $chunk_size);

            // Nur Chunks mit ausreichend Inhalt
            if (strlen(trim($chunk)) >= 100) {
                $chunks[] = trim($chunk);
            }
        }

        return $chunks;
    }

    /**
     * Embedding Phase starten
     */
    private function start_embedding_phase()
    {
        global $wpdb;

        $progress = get_option('kb_indexing_progress', []);
        $progress['phase'] = 'generating_embeddings';
        $progress['message'] = 'Generiere Embeddings...';
        $progress['processed'] = 0;

        // Alle Zeilen ohne Embeddings zählen
        $total_embeddings = $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name} WHERE embedding = '[]'");
        $progress['total'] = $total_embeddings;

        update_option('kb_indexing_progress', $progress);

        // Ersten Embedding Batch starten
        wp_schedule_single_event(time() + 5, 'kb_process_embedding_batch', [0]);

        $this->debug("Starting embedding phase with $total_embeddings items");
    }

    /**
     * Embedding Batch verarbeiten
     */
    public function process_embedding_batch($start_index)
    {
        global $wpdb;

        $progress = get_option('kb_indexing_progress', []);

        try {
            $batch_size = $this->options['embedding_chunk_size']; // 20 für Bulk Processing

            // Items ohne Embeddings holen
            $items = $wpdb->get_results($wpdb->prepare("
                SELECT id, content 
                FROM {$this->table_name} 
                WHERE embedding = '[]' 
                LIMIT %d OFFSET %d
            ", $batch_size, $start_index));

            if (empty($items)) {
                // Alle Embeddings generiert
                $this->finish_indexing('completed', 'Indexierung erfolgreich abgeschlossen!');
                return;
            }

            // Bulk Embeddings generieren
            $contents = array_map(function ($item) {
                return $item->content;
            }, $items);
            $embeddings = $this->get_bulk_openai_embeddings($contents);

            if (!$embeddings) {
                throw new Exception('Fehler beim Generieren der Embeddings');
            }

            // Embeddings in Datenbank speichern
            foreach ($items as $index => $item) {
                if (isset($embeddings[$index])) {
                    $wpdb->update(
                        $this->table_name,
                        ['embedding' => json_encode($embeddings[$index])],
                        ['id' => $item->id]
                    );
                }
            }

            // Progress updaten
            $progress['processed'] = $start_index + count($items);
            $progress['current_batch'] = intval($start_index / $batch_size) + 1;
            $progress['message'] = "Generiere Embeddings... ({$progress['processed']}/{$progress['total']})";
            $progress['estimated_remaining'] = $this->calculate_remaining_time($progress);

            update_option('kb_indexing_progress', $progress);

            // Nächsten Batch schedulen
            wp_schedule_single_event(time() + 3, 'kb_process_embedding_batch', [$start_index + $batch_size]);

            $this->debug("Processed embedding batch: " . count($items) . " items");

            // Rate limiting
            sleep($this->options['openai_rate_limit']);
        } catch (Exception $e) {
            $this->debug("Error in process_embedding_batch: " . $e->getMessage());
            $this->finish_indexing('error', 'Fehler beim Generieren der Embeddings: ' . $e->getMessage());
        }
    }

    // Neue Methode für gecachte Embeddings
    private function get_cached_embeddings()
    {
        $cache_key = 'kb_embeddings_cache';
        $cached = get_transient($cache_key);

        if ($cached !== false) {
            return $cached;
        }

        global $wpdb;
        $embeddings = $wpdb->get_results("
        SELECT id, embedding 
        FROM {$this->table_name} 
        WHERE embedding != '[]'
    ", OBJECT_K);

        set_transient($cache_key, $embeddings, HOUR_IN_SECONDS);
        return $embeddings;
    }

    // Cache invalidieren bei Updates
    public function invalidate_cache()
    {
        delete_transient('kb_embeddings_cache');
    }

    /**
     * Bulk Embeddings von OpenAI abrufen
     */
    private function get_bulk_openai_embeddings($texts)
    {
        // Max 2048 embeddings per request bei text-embedding-3-small
        $chunks = array_chunk($texts, 100); // Sicherer mit 100 per request
        $all_embeddings = [];

        foreach ($chunks as $chunk) {
            $response = wp_remote_post('https://api.openai.com/v1/embeddings', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->openai_api_key,
                    'Content-Type' => 'application/json'
                ],
                'body' => json_encode([
                    'input' => $chunk,
                    'model' => 'text-embedding-3-small',
                    'dimensions' => 512 // Reduziere Dimensionen für MySQL Performance
                ]),
                'timeout' => 60
            ]);

            // Error handling...
            $result = json_decode(wp_remote_retrieve_body($response), true);

            if (isset($result['data'])) {
                foreach ($result['data'] as $item) {
                    $all_embeddings[] = $item['embedding'];
                }
            }

            usleep(100000); // 100ms delay zwischen requests
        }

        return $all_embeddings;
    }

    /**
     * Indexierung beenden
     */
    private function finish_indexing($status, $message)
    {
        $progress = get_option('kb_indexing_progress', []);
        $progress['status'] = $status;
        $progress['message'] = $message;
        $progress['end_time'] = time();

        if ($status === 'completed') {
            // Cleanup
            unset($progress['all_pages']);

            // Performance Stats aktualisieren
            $this->update_performance_stats();
        }

        update_option('kb_indexing_progress', $progress);

        // Geplante Events löschen
        wp_clear_scheduled_hook('kb_process_atlassian_batch');
        wp_clear_scheduled_hook('kb_process_embedding_batch');

        $this->debug("Indexing finished with status: $status - $message");
    }

    /**
     * Progress abrufen
     */
    public function get_indexing_progress()
    {
        if (!wp_verify_nonce($_POST['nonce'], 'kb_nonce')) {
            wp_send_json_error(['message' => 'Security check failed']);
        }

        $progress = get_option('kb_indexing_progress');

        if (!$progress) {
            wp_send_json_error(['message' => 'No progress data available']);
        }

        wp_send_json_success($progress);
    }

    /**
     * Indexierung abbrechen
     */
    public function cancel_indexing()
    {
        if (!wp_verify_nonce($_POST['nonce'], 'kb_nonce')) {
            wp_send_json_error(['message' => 'Security check failed']);
        }

        // Geplante Events löschen
        wp_clear_scheduled_hook('kb_process_atlassian_batch');
        wp_clear_scheduled_hook('kb_process_embedding_batch');

        // Progress löschen
        delete_option('kb_indexing_progress');

        wp_send_json_success(['message' => 'Indexierung abgebrochen']);
    }

    /**
     * Verbleibende Zeit berechnen
     */
    private function calculate_remaining_time($progress)
    {
        if (!isset($progress['start_time']) || $progress['processed'] <= 0) {
            return 'berechne...';
        }

        $elapsed = time() - $progress['start_time'];
        $rate = $progress['processed'] / $elapsed; // Items pro Sekunde
        $remaining_items = $progress['total'] - $progress['processed'];

        if ($rate <= 0) {
            return 'berechne...';
        }

        $remaining_seconds = $remaining_items / $rate;

        if ($remaining_seconds < 60) {
            return round($remaining_seconds) . 's';
        } elseif ($remaining_seconds < 3600) {
            return round($remaining_seconds / 60) . 'min';
        } else {
            return round($remaining_seconds / 3600, 1) . 'h';
        }
    }

    /**
     * Performance Stats abrufen
     */
    private function get_performance_stats()
    {
        global $wpdb;

        // Durchschnittliche Query Zeit messen
        $start_time = microtime(true);
        $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name}");
        $query_time = round((microtime(true) - $start_time) * 1000, 2);

        // Memory Usage
        $memory_usage = round(memory_get_usage(true) / 1024 / 1024, 1);

        // Buffer Pool Status
        $buffer_pool = $wpdb->get_var("SHOW STATUS LIKE 'innodb_buffer_pool_size'");
        $buffer_status = $buffer_pool ? 'Optimiert' : 'Standard';

        return [
            'avg_query_time' => $query_time,
            'memory_usage' => $memory_usage,
            'buffer_pool_status' => $buffer_status
        ];
    }

    /**
     * Server Memory Info
     */
    private function get_server_memory()
    {
        $memory = ['total_mb' => 0, 'available_mb' => 0];

        if (function_exists('sys_getloadavg') && is_readable('/proc/meminfo')) {
            $meminfo = file_get_contents('/proc/meminfo');
            if (preg_match('/MemTotal:\s+(\d+)\s+kB/', $meminfo, $matches)) {
                $memory['total_mb'] = round($matches[1] / 1024);
                $memory['available_mb'] = round($matches[1] / 1024 * 0.8); // 80% als verfügbar annehmen
            }
        }

        return $memory;
    }

    /**
     * Bestehende Knowledge Base Methoden (gekürzt)...
     */

    // Enhanced AI Query für bessere Atlassian Integration
    public function enhance_ai_query($query_obj)
    {
        if ($this->options["debug"]) $this->debug("=== enhance_ai_query START ===");

        $query_text = '';

        // Query Text extrahieren (verschiedene AI Engine Versionen)
        if (method_exists($query_obj, 'get_message')) {
            $query_text = $query_obj->get_message();
        } elseif (property_exists($query_obj, 'message')) {
            $query_text = $query_obj->message;
        } elseif (property_exists($query_obj, 'query')) {
            $query_text = $query_obj->query;
        }

        if (empty($query_text)) {
            return $query_obj;
        }

        // Enhanced Knowledge Search mit Atlassian Priorität
        $knowledge = $this->search_enhanced_knowledge($query_text, 5);

        if (!empty($knowledge)) {
            $context = "=== KNOWLEDGE BASE CONTEXT ===\n";

            foreach ($knowledge as $item) {
                $source_info = '';
                if ($item['content_type'] === 'atlassian') {
                    $source_info = " [Handbuch]";
                } elseif (in_array($item['content_type'], ['page', 'post'])) {
                    $source_info = " [Website]";
                }

                $context .= "• " . trim($item['content']) . $source_info . "\n";
            }

            $context .= "\n=== ORIGINAL QUESTION ===\n";
            $enhanced_query = $context . $query_text;

            // Query zurück ins Objekt setzen
            if (method_exists($query_obj, 'set_message')) {
                $query_obj->set_message($enhanced_query);
            } elseif (property_exists($query_obj, 'message')) {
                $query_obj->message = $enhanced_query;
            } elseif (property_exists($query_obj, 'query')) {
                $query_obj->query = $enhanced_query;
            }
        }

        return $query_obj;
    }

    /**
     * Enhanced Knowledge Search mit Prioritäten
     */
    public function search_enhanced_knowledge($query, $limit = 5)
    {
        global $wpdb;

        $query_embedding = $this->get_single_openai_embedding($query);
        if (!$query_embedding) return [];

        // Hole ALLE Embeddings und berechne in PHP (MySQL kann keine Vector ops)
        $results = $wpdb->get_results("
            SELECT id, content, embedding, source, content_type, atlassian_page_id
            FROM {$this->table_name} 
            WHERE embedding != '[]'
            AND LENGTH(embedding) > 10
        ", ARRAY_A);

        $scored_results = [];

        foreach ($results as $row) {
            $doc_embedding = json_decode($row['embedding'], true);
            if (!$doc_embedding || count($doc_embedding) !== count($query_embedding)) continue;

            $similarity = $this->cosine_similarity($query_embedding, $doc_embedding);

            // Boost Atlassian content
            if ($row['content_type'] === 'atlassian') {
                $similarity *= 1.2;
            }

            $scored_results[] = [
                'content' => $row['content'],
                'source' => $row['source'],
                'content_type' => $row['content_type'],
                'score' => $similarity,
                'atlassian_page_id' => $row['atlassian_page_id']
            ];
        }

        // Sort by score
        usort($scored_results, fn($a, $b) => $b['score'] <=> $a['score']);

        return array_slice($scored_results, 0, $limit);
    }

    /**
     * Single Embedding abrufen
     */
    private function get_single_openai_embedding($text)
    {
        if (!$this->openai_api_key) {
            return false;
        }

        $data = [
            'input' => $text,
            'model' => 'text-embedding-3-small'
        ];

        $response = wp_remote_post('https://api.openai.com/v1/embeddings', [
            'headers' => [
                'Authorization' => 'Bearer ' . $this->openai_api_key,
                'Content-Type' => 'application/json'
            ],
            'body' => json_encode($data),
            'timeout' => 30
        ]);

        if (is_wp_error($response)) {
            return false;
        }

        $result = json_decode(wp_remote_retrieve_body($response), true);

        if (isset($result['error'])) {
            return false;
        }

        return $result['data'][0]['embedding'] ?? false;
    }

    /**
     * Cosine Similarity berechnen
     */
    private function cosine_similarity($a, $b)
    {
        if (count($a) !== count($b)) return 0;

        $dot_product = 0;
        $norm_a = 0;
        $norm_b = 0;

        for ($i = 0; $i < count($a); $i++) {
            $dot_product += $a[$i] * $b[$i];
            $norm_a += $a[$i] * $a[$i];
            $norm_b += $b[$i] * $b[$i];
        }

        if ($norm_a == 0 || $norm_b == 0) return 0;

        return $dot_product / (sqrt($norm_a) * sqrt($norm_b));
    }

    /**
     * Cleanup alter Atlassian Inhalte
     */
    private function cleanup_atlassian_content($pages)
    {
        global $wpdb;

        $page_ids = array_map(function ($page) {
            return $page['id'];
        }, $pages);

        if (!empty($page_ids)) {
            $placeholders = implode(',', array_fill(0, count($page_ids), '%s'));
            $wpdb->query($wpdb->prepare("
                DELETE FROM {$this->table_name} 
                WHERE atlassian_page_id IN ($placeholders)
            ", $page_ids));
        }
    }

    /**
     * WordPress Auto-Update (vereinfacht)
     */
    public function auto_update_post($post_id, $post, $update)
    {
        if (!in_array($post->post_type, ['post', 'page']) || $post->post_status !== 'publish') {
            return;
        }

        if (wp_is_post_autosave($post_id) || wp_is_post_revision($post_id)) {
            return;
        }

        // Schedule WordPress content update
        wp_schedule_single_event(time() + 30, 'kb_update_single_post', [$post_id]);
    }

    public function auto_delete_post($post_id)
    {
        global $wpdb;
        $wpdb->delete($this->table_name, ['content_id' => $post_id]);
    }

    /**
     * Utility Methods
     */
    private function table_exists()
    {
        global $wpdb;
        $table_name = $wpdb->prefix . 'knowledge_base';
        $query = $wpdb->prepare("SHOW TABLES LIKE %s", $table_name);
        return $wpdb->get_var($query) == $table_name;
    }

    private function debug($message, $data = null)
    {
        if (!$this->options["debug"]) return;

        $timestamp = date('H:i:s');
        $log_entry = "[$timestamp] KB: $message";

        if ($data !== null) {
            $log_entry .= " | DATA: " . print_r($data, true);
        }

        error_log($log_entry);
        $this->debug_log[] = $log_entry;

        // In Datenbank für Admin-View
        update_option('kb_last_debug_log', array_slice($this->debug_log, -100), false);
    }

    /**
     * Performance Stats Update
     */
    private function update_performance_stats()
    {
        global $wpdb;

        $stats = [
            'total_embeddings' => $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name} WHERE embedding != '[]'"),
            'atlassian_count' => $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name} WHERE content_type = 'atlassian'"),
            'wordpress_count' => $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name} WHERE content_type IN ('page', 'post')"),
            'last_updated' => time()
        ];

        update_option('kb_performance_stats', $stats);
    }

    /**
     * WordPress Content indexieren
     */
    public function index_wordpress_content()
    {
        if (!wp_verify_nonce($_POST['nonce'], 'kb_nonce')) {
            wp_send_json_error(['message' => 'Security check failed']);
        }

        global $wpdb;

        // WordPress Inhalte löschen
        $deleted = $wpdb->delete($this->table_name, ['content_type' => 'page']);
        $deleted += $wpdb->delete($this->table_name, ['content_type' => 'post']);

        // Alle Seiten/Posts holen
        $posts = get_posts([
            'post_type' => ['page', 'post'],
            'numberposts' => -1,
            'post_status' => 'publish'
        ]);

        $total_stored = 0;
        foreach ($posts as $post) {
            $content = wp_strip_all_tags($post->post_title . "\n\n" . $post->post_content);
            $content = preg_replace('/\s+/', ' ', $content);

            if (strlen($content) > 100) {
                $chunks = $this->create_content_chunks($content, $post->post_title);

                foreach ($chunks as $chunk) {
                    $wpdb->insert($this->table_name, [
                        'content' => $chunk,
                        'embedding' => '[]',
                        'source' => $post->post_type . '_' . $post->ID,
                        'content_type' => $post->post_type,
                        'content_id' => $post->ID
                    ]);
                    $total_stored++;
                }
            }
        }

        // Embeddings generieren
        wp_schedule_single_event(time() + 5, 'kb_process_embedding_batch', [0]);

        wp_send_json_success(['message' => "$total_stored Chunks von " . count($posts) . " Posts indexiert"]);
    }

    /**
     * Test Search
     */
    public function test_search()
    {
        if (!wp_verify_nonce($_POST['nonce'], 'kb_nonce')) {
            wp_send_json_error(['message' => 'Security check failed']);
        }

        $query = sanitize_text_field($_POST['query']);

        global $wpdb;

        // Debug Info sammeln
        $debug_info = [
            'query' => $query,
            'total_entries' => $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name}"),
            'with_embeddings' => $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name} WHERE embedding != '[]' AND LENGTH(embedding) > 10"),
            'openai_key_set' => !empty($this->openai_api_key),
            'sample_content' => $wpdb->get_results("SELECT LEFT(content, 100) as preview, content_type FROM {$this->table_name} LIMIT 5")
        ];

        $this->debug("Test Search Debug", $debug_info);

        // Test ob Embedding funktioniert
        $test_embedding = $this->get_single_openai_embedding("test");
        if (!$test_embedding) {
            echo '<div style="background: #fee; padding: 10px; border: 1px solid #f00;">';
            echo '<strong>⚠️ OpenAI Embedding Error!</strong><br>';
            echo 'API Key gesetzt: ' . ($this->openai_api_key ? 'Ja' : 'Nein') . '<br>';
            echo 'Debug Log:<pre>' . implode("\n", array_slice($this->debug_log, -10)) . '</pre>';
            echo '</div>';
            wp_die();
        }

        // Actual Search
        $results = $this->search_enhanced_knowledge($query, 5);

        echo '<div style="background: #f0f8ff; padding: 10px; margin-bottom: 10px;">';
        echo '<strong>📊 Debug Info:</strong><br>';
        echo "Total DB Entries: {$debug_info['total_entries']}<br>";
        echo "With Embeddings: {$debug_info['with_embeddings']}<br>";
        echo "Query Embedding Size: " . count($test_embedding) . " dimensions<br>";
        echo '</div>';

        if (empty($results)) {
            echo '<p>❌ Keine Ergebnisse. Mögliche Gründe:</p>';
            echo '<ul>';
            echo '<li>Keine Embeddings generiert (aktuell: ' . $debug_info['with_embeddings'] . ')</li>';
            echo '<li>OpenAI API Problem</li>';
            echo '<li>Leere Datenbank</li>';
            echo '</ul>';

            echo '<h4>Sample Content in DB:</h4>';
            foreach ($debug_info['sample_content'] as $sample) {
                echo "<div>Type: {$sample->content_type} | Preview: {$sample->preview}...</div>";
            }
        } else {
            echo '<h4>🔍 Gefundene Inhalte:</h4>';
            foreach ($results as $i => $result) {
                $score = round($result['score'] * 100, 1);
                $type_badge = $result['content_type'] === 'atlassian' ? '📚 Handbuch' : "📄 {$result['content_type']}";
                echo "<div style='border: 1px solid #ddd; padding: 10px; margin: 5px 0;'>";
                echo "<strong>Relevanz: {$score}%</strong> $type_badge<br>";
                echo "<em>" . substr($result['content'], 0, 200) . "...</em>";
                echo "<div style='font-size: 10px; color: #666; margin-top: 5px;'>Source: {$result['source']}</div>";
                echo "</div>";
            }
        }

        // Debug Log am Ende
        echo '<details style="margin-top: 20px;">';
        echo '<summary>🔧 Debug Log (last 20 entries)</summary>';
        echo '<pre style="background: #f4f4f4; padding: 10px; font-size: 11px;">';
        echo implode("\n", array_slice($this->debug_log, -20));
        echo '</pre>';
        echo '</details>';

        wp_die();
    }
    public function optimize_database()
    {
        if (!wp_verify_nonce($_POST['nonce'], 'kb_nonce')) {
            wp_send_json_error(['message' => 'Security check failed']);
        }

        global $wpdb;

        try {
            // Index optimization
            $wpdb->query("OPTIMIZE TABLE {$this->table_name}");

            // Update table statistics
            $wpdb->query("ANALYZE TABLE {$this->table_name}");

            // Performance tuning
            $this->optimize_mysql_config();

            wp_send_json_success(['message' => 'Datenbank erfolgreich optimiert!']);
        } catch (Exception $e) {
            wp_send_json_error(['message' => 'Optimierung fehlgeschlagen: ' . $e->getMessage()]);
        }
    }
}

// Knowledge Base initialisieren
new Enhanced_WP_Knowledge_Base([
    "debug" => true,
    "batch_size" => 10,           // 10 Seiten pro Batch
    "embedding_chunk_size" => 20, // 20 Embeddings pro API Call
    "atlassian_rate_limit" => 2,  // 2 Sekunden zwischen Atlassian Calls
    "openai_rate_limit" => 1      // 1 Sekunde zwischen OpenAI Calls
]);

?>