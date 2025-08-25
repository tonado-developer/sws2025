<?php

/**
 * Simplified Confluence to Qdrant Vector Database Sync
 * - Nur Cronjob-basierte Verarbeitung
 * - Ein URL-Endpoint für alles  
 * - Automatische Batch-Verarbeitung
 * - Einfaches Progress-Tracking
 * 
 * Installation: In functions.php includen:
 * require_once get_template_directory() . '/confluence-qdrant-simple.php';
 */

if (!defined('ABSPATH')) {
    exit;
}

class Simple_Confluence_Qdrant_Sync
{
    private $openai_api_key;
    private $qdrant_url;
    private $qdrant_api_key;
    private $atlassian_base_url;
    private $atlassian_email;
    private $atlassian_token;
    private $collection_name = 'confluence_docs';

    // Batch-Größen (anpassbar je nach Server-Performance)
    private $pages_per_batch = 25;
    private $embeddings_per_batch = 50;
    private $embedding_model = "text-embedding-3-small";
    private $embedding_dimensions = 1536;
    private $chunk_size = 800;

    public function __construct()
    {
        // Load API Keys
        $this->openai_api_key = get_option('scqs_openai_key', '');
        $this->qdrant_url = get_option('scqs_qdrant_url', 'http://localhost:6333');
        $this->qdrant_api_key = get_option('scqs_qdrant_api_key', '');
        $this->atlassian_base_url = get_option('scqs_atlassian_base_url', '');
        $this->atlassian_email = get_option('scqs_atlassian_email', '');
        $this->atlassian_token = get_option('scqs_atlassian_token', '');

        // WordPress Hooks
        add_action('init', [$this, 'init']);
        add_action('admin_menu', [$this, 'admin_menu']);

        // AJAX Handlers
        add_action('wp_ajax_scqs_start_sync', [$this, 'start_sync']);
        add_action('wp_ajax_scqs_process_batch', [$this, 'process_batch']);
        add_action('wp_ajax_scqs_get_status', [$this, 'get_status']);
        add_action('wp_ajax_scqs_reset_sync', [$this, 'reset_sync']);
        add_action('wp_ajax_scqs_test_search', [$this, 'test_search']);

        // Public endpoint for cronjob (no nonce needed)
        add_action('wp_ajax_nopriv_scqs_cronjob', [$this, 'cronjob_endpoint']);
        add_action('wp_ajax_scqs_cronjob', [$this, 'cronjob_endpoint']);
    }

    public function init()
    {
        // Initialize Qdrant collection if needed
        if (get_option('scqs_initialized') !== '1') {
            $this->initialize_qdrant_collection();
        }
    }

    /**
     * Initialize Qdrant Collection
     */
    private function initialize_qdrant_collection()
    {
        if (empty($this->qdrant_url)) return false;

        $response = wp_remote_request($this->qdrant_url . '/collections/' . $this->collection_name, [
            'method' => 'PUT',
            'headers' => array_merge(
                ['Content-Type' => 'application/json'],
                $this->qdrant_api_key ? ['api-key' => $this->qdrant_api_key] : []
            ),
            'body' => json_encode([
                'vectors' => [
                    'size' => $this->embedding_dimensions,
                    'distance' => 'Cosine'
                ],
                'optimizers_config' => [
                    'default_segment_number' => 2,
                    'memmap_threshold' => 20000
                ],
                'replication_factor' => 1
            ]),
            'timeout' => 30
        ]);

        if (!is_wp_error($response)) {
            update_option('scqs_initialized', '1');
            $this->log("Qdrant collection initialized");
            return true;
        }

        $this->log("Failed to initialize Qdrant collection: " . $response->get_error_message());
        return false;
    }

    /**
     * Admin Menu
     */
    public function admin_menu()
    {
        add_options_page(
            'Simple Confluence Sync',
            'Simple Confluence Sync',
            'manage_options',
            'simple-confluence-sync',
            [$this, 'admin_page']
        );
    }

    /**
     * Admin Page
     */
    public function admin_page()
    {
        // Save settings
        if ($_POST['save_settings'] ?? false) {
            update_option('scqs_openai_key', sanitize_text_field($_POST['openai_key']));
            update_option('scqs_qdrant_url', esc_url_raw($_POST['qdrant_url']));
            update_option('scqs_qdrant_api_key', sanitize_text_field($_POST['qdrant_api_key']));
            update_option('scqs_atlassian_base_url', esc_url_raw($_POST['atlassian_base_url']));
            update_option('scqs_atlassian_email', sanitize_email($_POST['atlassian_email']));
            update_option('scqs_atlassian_token', sanitize_text_field($_POST['atlassian_token']));

            // Reload settings
            $this->openai_api_key = get_option('scqs_openai_key');
            $this->qdrant_url = get_option('scqs_qdrant_url');
            $this->qdrant_api_key = get_option('scqs_qdrant_api_key');
            $this->atlassian_base_url = get_option('scqs_atlassian_base_url');
            $this->atlassian_email = get_option('scqs_atlassian_email');
            $this->atlassian_token = get_option('scqs_atlassian_token');

            echo '<div class="notice notice-success"><p>✅ Einstellungen gespeichert!</p></div>';
        }

        $status = get_option('scqs_status', ['phase' => 'idle']);
        $is_running = in_array($status['phase'], ['fetching', 'processing', 'embedding']);

?>
        <div class="wrap">
            <h1>🚀 Simple Confluence → Qdrant Sync</h1>

            <!-- Status Dashboard -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0;">

                <div style="background: #fff; padding: 20px; border-left: 4px solid #0073aa; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 10px 0; color: #0073aa;">📊 Sync Status</h3>
                    <div id="status-display">
                        <p><strong>Phase:</strong> <?= $status['phase'] ?></p>
                        <?php if (isset($status['processed'])): ?>
                            <p><strong>Progress:</strong> <?= $status['processed'] ?>/<?= $status['total'] ?></p>
                            <p><strong>Percentage:</strong> <?= round(($status['processed'] / $status['total']) * 100, 1) ?>%</p>
                        <?php endif; ?>
                        <?php if (isset($status['message'])): ?>
                            <p><strong>Message:</strong> <?= $status['message'] ?></p>
                        <?php endif; ?>
                    </div>
                </div>

                <div style="background: #fff; padding: 20px; border-left: 4px solid #00a32a; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 10px 0; color: #00a32a;">🔧 Cronjob Setup</h3>
                    <p><strong>Cronjob URL:</strong></p>
                    <code style="background: #f0f0f0; padding: 5px; word-break: break-all; display: block; margin: 10px 0;">
                        <?= admin_url('admin-ajax.php?action=scqs_cronjob') ?>
                    </code>
                    <p><strong>Plesk Command:</strong></p>
                    <code style="background: #f0f0f0; padding: 5px; word-break: break-all; display: block;">
                        curl -s "<?= admin_url('admin-ajax.php?action=scqs_cronjob') ?>"
                    </code>
                    <small>Empfehlung: Alle 2-5 Minuten ausführen</small>
                </div>

            </div>

            <?php if ($is_running): ?>
                <div style="background: #fff8e1; border: 1px solid #ffcc02; padding: 20px; margin: 20px 0; border-radius: 5px;">
                    <h3>🔄 Synchronisierung läuft...</h3>
                    <div style="background: #f0f0f0; height: 20px; border-radius: 10px; overflow: hidden;">
                        <?php $percent = isset($status['total']) && $status['total'] > 0 ? ($status['processed'] / $status['total']) * 100 : 0; ?>
                        <div style="background: #4CAF50; height: 100%; width: <?= $percent ?>%; transition: width 0.3s;"></div>
                    </div>
                    <p style="margin-top: 10px;">
                        <strong>Phase:</strong> <?= $status['phase'] ?><br>
                        <strong>Verarbeitet:</strong> <?= $status['processed'] ?? 0 ?>/<?= $status['total'] ?? '?' ?><br>
                        <strong>Letztes Update:</strong> <?= date('H:i:s', $status['last_update'] ?? time()) ?>
                    </p>
                    <button id="refresh-status" class="button">🔄 Status aktualisieren</button>
                    <button id="reset-sync" class="button button-secondary">⏹️ Sync zurücksetzen</button>
                </div>
            <?php endif; ?>

            <!-- API Settings -->
            <div style="background: #fff; padding: 20px; margin: 20px 0; border: 1px solid #ddd;">
                <h3>🔧 API Einstellungen</h3>
                <form method="post">
                    <table class="form-table">
                        <tr>
                            <th colspan="2">
                                <h4>OpenAI</h4>
                            </th>
                        </tr>
                        <tr>
                            <th>API Key</th>
                            <td>
                                <input type="password" name="openai_key" value="<?= esc_attr($this->openai_api_key) ?>" style="width: 400px;" placeholder="sk-...">
                            </td>
                        </tr>

                        <tr>
                            <th colspan="2">
                                <h4>Qdrant</h4>
                            </th>
                        </tr>
                        <tr>
                            <th>URL</th>
                            <td>
                                <input type="url" name="qdrant_url" value="<?= esc_attr($this->qdrant_url) ?>" style="width: 400px;" placeholder="http://localhost:6333">
                            </td>
                        </tr>
                        <tr>
                            <th>API Key (optional)</th>
                            <td>
                                <input type="password" name="qdrant_api_key" value="<?= esc_attr($this->qdrant_api_key) ?>" style="width: 400px;">
                            </td>
                        </tr>

                        <tr>
                            <th colspan="2">
                                <h4>Confluence</h4>
                            </th>
                        </tr>
                        <tr>
                            <th>Base URL</th>
                            <td>
                                <input type="url" name="atlassian_base_url" value="<?= esc_attr($this->atlassian_base_url) ?>" style="width: 400px;" placeholder="https://company.atlassian.net/wiki">
                            </td>
                        </tr>
                        <tr>
                            <th>Email</th>
                            <td>
                                <input type="email" name="atlassian_email" value="<?= esc_attr($this->atlassian_email) ?>" style="width: 400px;">
                            </td>
                        </tr>
                        <tr>
                            <th>API Token</th>
                            <td>
                                <input type="password" name="atlassian_token" value="<?= esc_attr($this->atlassian_token) ?>" style="width: 400px;">
                            </td>
                        </tr>
                    </table>
                    <input type="submit" name="save_settings" class="button-primary" value="💾 Speichern">
                </form>
            </div>

            <!-- Actions -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0;">

                <div style="background: #fff; padding: 20px; border: 1px solid #ddd;">
                    <h3>🚀 Synchronisierung</h3>
                    <p>Startet den Sync-Prozess. Der Plesk Cronjob übernimmt dann die weitere Verarbeitung.</p>
                    <button id="start-sync" class="button-primary" <?= $is_running ? 'disabled' : '' ?>>
                        🚀 Sync starten
                    </button>
                    <div id="sync-result" style="margin-top: 10px;"></div>
                </div>

                <div style="background: #fff; padding: 20px; border: 1px solid #ddd;">
                    <h3>🔍 Search Test</h3>
                    <input type="text" id="search-query" placeholder="Test-Suche..." style="width: 100%; margin-bottom: 10px;">
                    <button id="test-search" class="button">🔍 Testen</button>
                    <div id="search-results" style="margin-top: 10px; max-height: 200px; overflow-y: auto;"></div>
                </div>

            </div>

            <!-- Debug Log -->
            <div style="background: #fff; padding: 20px; margin: 20px 0; border: 1px solid #ddd;">
                <h3>🐛 Debug Log</h3>
                <div id="debug-log" style="background: #f4f4f4; padding: 10px; font-family: monospace; font-size: 12px; max-height: 300px; overflow-y: auto;">
                    <?php
                    $log = get_option('scqs_debug_log', []);
                    if (!empty($log)) {
                        echo implode("<br>", array_slice($log, -20));
                    } else {
                        echo "Keine Debug-Einträge vorhanden.";
                    }
                    ?>
                </div>
            </div>
        </div>

        <script>
            jQuery(document).ready(function($) {
                const nonce = '<?= wp_create_nonce('scqs_nonce') ?>';

                // Start Sync
                $('#start-sync').on('click', function() {
                    if (!confirm('Confluence Sync starten?\n\nStelle sicher, dass der Plesk Cronjob eingerichtet ist!')) return;

                    $(this).prop('disabled', true).text('🔄 Starte...');

                    $.post(ajaxurl, {
                        action: 'scqs_start_sync',
                        nonce: nonce
                    }, function(response) {
                        if (response.success) {
                            $('#sync-result').html('<span style="color: green;">✅ ' + response.data.message + '</span>');
                            setTimeout(() => location.reload(), 2000);
                        } else {
                            $('#sync-result').html('<span style="color: red;">❌ ' + response.data.message + '</span>');
                            $('#start-sync').prop('disabled', false).text('🚀 Sync starten');
                        }
                    });
                });

                // Reset Sync
                $('#reset-sync').on('click', function() {
                    if (!confirm('Sync wirklich zurücksetzen?')) return;

                    $.post(ajaxurl, {
                        action: 'scqs_reset_sync',
                        nonce: nonce
                    }, function(response) {
                        if (response.success) {
                            location.reload();
                        }
                    });
                });

                // Refresh Status
                $('#refresh-status').on('click', function() {
                    location.reload();
                });

                // Test Search
                $('#test-search').on('click', function() {
                    const query = $('#search-query').val().trim();
                    if (!query) return;

                    $('#search-results').html('<div style="color: orange;">🔄 Suche...</div>');

                    $.post(ajaxurl, {
                        action: 'scqs_test_search',
                        query: query,
                        nonce: nonce
                    }, function(response) {
                        $('#search-results').html(response);
                    });
                });

                // Auto-refresh status if running
                <?php if ($is_running): ?>
                    setInterval(function() {
                        $.post(ajaxurl, {
                            action: 'scqs_get_status',
                            nonce: nonce
                        }, function(response) {
                            if (response.success && response.data) {
                                const status = response.data;
                                if (status.phase === 'completed' || status.phase === 'error') {
                                    location.reload();
                                }
                            }
                        });
                    }, 5000);
                <?php endif; ?>
            });
        </script>
<?php
    }

    /**
     * Start Sync - Initialisiert den Sync-Prozess
     */
    public function start_sync()
    {
        if (!wp_verify_nonce($_POST['nonce'], 'scqs_nonce')) {
            wp_send_json_error(['message' => 'Security check failed']);
        }

        // Check if already running
        $status = get_option('scqs_status', ['phase' => 'idle']);
        if (in_array($status['phase'], ['fetching', 'processing', 'embedding'])) {
            wp_send_json_error(['message' => 'Sync läuft bereits']);
            return;
        }

        // Reset status
        update_option('scqs_status', [
            'phase' => 'fetching',
            'message' => 'Synchronisierung gestartet',
            'last_update' => time(),
            'start_time' => time()
        ]);

        // Clear old data
        delete_option('scqs_all_pages');
        delete_option('scqs_chunks');

        wp_send_json_success(['message' => 'Sync gestartet. Der Cronjob übernimmt jetzt die Verarbeitung.']);
    }

    /**
     * Cronjob Endpoint - Wird vom Plesk Cronjob aufgerufen
     */
    public function cronjob_endpoint()
    {
        // Keine Nonce-Prüfung für Cronjob-Endpoint
        $this->log("=== CRONJOB TRIGGERED ===");

        $status = get_option('scqs_status', ['phase' => 'idle']);

        // Prüfen ob Sync läuft
        if (!in_array($status['phase'], ['fetching', 'processing', 'embedding'])) {
            $this->log("No active sync, cronjob stopping");
            wp_die('No active sync');
        }

        // Timeout-Check (falls Cronjob länger als 1 Stunde nicht lief)
        $last_update = $status['last_update'] ?? time();
        if ((time() - $last_update) > 3600) {
            $this->log("Sync timeout detected, resetting");
            update_option('scqs_status', ['phase' => 'error', 'message' => 'Sync timeout']);
            wp_die('Sync timeout');
        }

        try {
            switch ($status['phase']) {
                case 'fetching':
                    $this->fetch_confluence_pages();
                    break;
                case 'processing':
                    $this->process_pages_batch();
                    break;
                case 'embedding':
                    $this->process_embedding_batch();
                    break;
            }
        } catch (Exception $e) {
            $this->log("Cronjob error: " . $e->getMessage());
            update_option('scqs_status', [
                'phase' => 'error',
                'message' => $e->getMessage(),
                'last_update' => time()
            ]);
        }

        wp_die('OK');
    }

    /**
     * Fetch all Confluence pages
     */
    private function fetch_confluence_pages()
    {
        $this->log("Fetching Confluence pages...");

        $all_pages = [];
        $start = 0;
        $limit = 50;
        $max_iterations = 100;

        $headers = [];
        if ($this->atlassian_email && $this->atlassian_token) {
            $headers['Authorization'] = 'Basic ' . base64_encode("{$this->atlassian_email}:{$this->atlassian_token}");
        }

        for ($i = 0; $i < $max_iterations; $i++) {
            $url = $this->atlassian_base_url . "/rest/api/content?type=page&expand=body.storage,space&limit=$limit&start=$start";

            $response = wp_remote_get($url, [
                'headers' => $headers,
                'timeout' => 30
            ]);

            if (is_wp_error($response)) {
                throw new Exception('Failed to fetch Confluence pages: ' . $response->get_error_message());
            }

            $data = json_decode(wp_remote_retrieve_body($response), true);

            if (!isset($data['results']) || empty($data['results'])) {
                break;
            }

            $all_pages = array_merge($all_pages, $data['results']);

            if (count($data['results']) < $limit) {
                break;
            }

            $start += $limit;

            // Rate limiting
            sleep(1);
        }

        if (empty($all_pages)) {
            throw new Exception('No pages found in Confluence');
        }

        // Store pages and move to processing phase
        update_option('scqs_all_pages', $all_pages);
        update_option('scqs_status', [
            'phase' => 'processing',
            'total' => count($all_pages),
            'processed' => 0,
            'message' => count($all_pages) . ' Seiten gefunden, starte Verarbeitung...',
            'last_update' => time()
        ]);

        $this->log("Fetched " . count($all_pages) . " pages, moving to processing phase");
    }

    /**
     * Process pages batch
     */
    private function process_pages_batch()
    {
        $status = get_option('scqs_status');
        $all_pages = get_option('scqs_all_pages', []);
        $processed = $status['processed'] ?? 0;

        $this->log("Processing pages batch starting at index: $processed");

        if (empty($all_pages)) {
            throw new Exception('No pages data found');
        }

        // Take batch
        $batch = array_slice($all_pages, $processed, $this->pages_per_batch);

        if (empty($batch)) {
            // All pages processed - move to embedding phase
            $this->log("All pages processed, moving to embedding phase");
            $this->start_embedding_phase();
            return;
        }

        // Process batch
        $existing_chunks = get_option('scqs_chunks', []);

        foreach ($batch as $page) {
            $chunks = $this->process_confluence_page($page);
            $existing_chunks = array_merge($existing_chunks, $chunks);
        }

        // Update chunks and status
        update_option('scqs_chunks', $existing_chunks);

        $new_processed = $processed + count($batch);
        update_option('scqs_status', array_merge($status, [
            'processed' => $new_processed,
            'message' => "Verarbeitung: $new_processed/{$status['total']} Seiten (" . count($existing_chunks) . " Chunks)",
            'last_update' => time()
        ]));

        $this->log("Processed batch: $new_processed/{$status['total']} pages, " . count($existing_chunks) . " total chunks");
    }

    /**
     * Start embedding phase
     */
    private function start_embedding_phase()
    {
        $chunks = get_option('scqs_chunks', []);

        if (empty($chunks)) {
            throw new Exception('No chunks to embed');
        }

        update_option('scqs_status', [
            'phase' => 'embedding',
            'total' => count($chunks),
            'processed' => 0,
            'message' => count($chunks) . ' Chunks gefunden, starte Embedding-Generierung...',
            'last_update' => time()
        ]);

        $this->log("Starting embedding phase with " . count($chunks) . " chunks");
    }

    /**
     * Process embedding batch
     */
    private function process_embedding_batch()
    {
        $status = get_option('scqs_status');
        $chunks = get_option('scqs_chunks', []);
        $processed = $status['processed'] ?? 0;

        $this->log("Processing embedding batch starting at index: $processed");

        // Take batch
        $batch = array_slice($chunks, $processed, $this->embeddings_per_batch);

        if (empty($batch)) {
            // All embeddings processed - sync complete
            $this->log("All embeddings processed, sync complete");
            $this->complete_sync();
            return;
        }

        // Get embeddings
        $texts = array_column($batch, 'content');
        $embeddings = $this->get_openai_embeddings($texts);

        if (!$embeddings || count($embeddings) !== count($texts)) {
            throw new Exception('Failed to generate embeddings');
        }

        // Create points for Qdrant
        $points = [];
        foreach ($batch as $index => $chunk) {
            if (isset($embeddings[$index])) {
                $points[] = [
                    'id' => wp_generate_uuid4(),
                    'vector' => $embeddings[$index],
                    'payload' => array_merge(
                        $chunk['metadata'],
                        ['content' => $chunk['content']]
                    )
                ];
            }
        }

        // Store in Qdrant
        $this->upsert_to_qdrant($points);

        // Update status
        $new_processed = $processed + count($batch);
        update_option('scqs_status', array_merge($status, [
            'processed' => $new_processed,
            'message' => "Embedding-Generierung: $new_processed/{$status['total']} Chunks",
            'last_update' => time()
        ]));

        $this->log("Processed embedding batch: $new_processed/{$status['total']} chunks");
    }

    /**
     * Complete sync
     */
    private function complete_sync()
    {
        update_option('scqs_status', [
            'phase' => 'completed',
            'message' => 'Synchronisierung erfolgreich abgeschlossen',
            'last_update' => time(),
            'completed_at' => date('Y-m-d H:i:s')
        ]);

        // Cleanup
        delete_option('scqs_all_pages');
        delete_option('scqs_chunks');

        $this->log("Sync completed successfully");
    }

    /**
     * Process single Confluence page into chunks
     */
    private function process_confluence_page($page)
    {
        $title = $page['title'] ?? 'Untitled';
        $page_id = $page['id'] ?? '';
        $space_key = $page['space']['key'] ?? '';
        $content = $this->extract_content_from_confluence($page);

        if (strlen($content) < 50) {
            return [];
        }

        // Create chunks
        $chunks = $this->create_content_chunks($content);

        $processed_chunks = [];
        foreach ($chunks as $chunk_text) {
            $processed_chunks[] = [
                'content' => $chunk_text,
                'metadata' => [
                    'source' => 'confluence',
                    'page_id' => $page_id,
                    'page_title' => $title,
                    'space_key' => $space_key,
                    'url' => "{$this->atlassian_base_url}/spaces/{$space_key}/pages/{$page_id}"
                ]
            ];
        }

        return $processed_chunks;
    }

    /**
     * Extract content from Confluence page
     */
    private function extract_content_from_confluence($page)
    {
        $content = $page['body']['storage']['value'] ?? '';

        // Remove HTML tags
        $content = strip_tags($content);

        // Decode HTML entities
        $content = html_entity_decode($content, ENT_QUOTES, 'UTF-8');

        // Normalize whitespace
        $content = preg_replace('/\s+/', ' ', $content);

        // Add title at the beginning
        $title = $page['title'] ?? '';
        if ($title) {
            $content = $title . "\n\n" . $content;
        }

        return trim($content);
    }

    /**
     * Create content chunks
     */
    private function create_content_chunks($content)
    {
        $chunks = [];
        $sentences = preg_split('/(?<=[.!?])\s+/', $content);
        $current_chunk = '';

        foreach ($sentences as $sentence) {
            if (strlen($current_chunk . ' ' . $sentence) <= $this->chunk_size) {
                $current_chunk .= ($current_chunk ? ' ' : '') . $sentence;
            } else {
                if ($current_chunk) {
                    $chunks[] = $current_chunk;
                }
                $current_chunk = $sentence;
            }
        }

        if ($current_chunk) {
            $chunks[] = $current_chunk;
        }

        return array_filter($chunks, function ($chunk) {
            return strlen(trim($chunk)) > 20; // Minimum chunk size
        });
    }

    /**
     * Get OpenAI embeddings
     */
    private function get_openai_embeddings($texts)
    {
        $response = wp_remote_post('https://api.openai.com/v1/embeddings', [
            'headers' => [
                'Authorization' => 'Bearer ' . $this->openai_api_key,
                'Content-Type' => 'application/json'
            ],
            'body' => json_encode([
                'input' => $texts,
                'model' => $this->embedding_model
            ]),
            'timeout' => 120
        ]);

        if (is_wp_error($response)) {
            throw new Exception('OpenAI API error: ' . $response->get_error_message());
        }

        $result = json_decode(wp_remote_retrieve_body($response), true);

        if (!isset($result['data'])) {
            throw new Exception('Invalid OpenAI response');
        }

        $embeddings = [];
        foreach ($result['data'] as $item) {
            $embeddings[] = $item['embedding'];
        }

        return $embeddings;
    }

    /**
     * Upsert points to Qdrant
     */
    private function upsert_to_qdrant($points)
    {
        $response = wp_remote_request($this->qdrant_url . '/collections/' . $this->collection_name . '/points', [
            'method' => 'PUT',
            'headers' => array_merge(
                ['Content-Type' => 'application/json'],
                $this->qdrant_api_key ? ['api-key' => $this->qdrant_api_key] : []
            ),
            'body' => json_encode(['points' => $points]),
            'timeout' => 60
        ]);

        if (is_wp_error($response)) {
            throw new Exception('Qdrant upsert error: ' . $response->get_error_message());
        }

        $code = wp_remote_retrieve_response_code($response);
        if ($code !== 200) {
            throw new Exception('Qdrant upsert failed with status: ' . $code);
        }
    }

    /**
     * Search in Qdrant
     */
    private function search_qdrant($query_vector, $limit = 5)
    {
        $response = wp_remote_post($this->qdrant_url . '/collections/' . $this->collection_name . '/points/search', [
            'headers' => array_merge(
                ['Content-Type' => 'application/json'],
                $this->qdrant_api_key ? ['api-key' => $this->qdrant_api_key] : []
            ),
            'body' => json_encode([
                'vector' => $query_vector,
                'limit' => $limit,
                'with_payload' => true
            ]),
            'timeout' => 10
        ]);

        if (is_wp_error($response)) {
            return [];
        }

        $data = json_decode(wp_remote_retrieve_body($response), true);
        return $data['result'] ?? [];
    }

    /**
     * Get single embedding for search
     */
    private function get_single_embedding($text)
    {
        $response = wp_remote_post('https://api.openai.com/v1/embeddings', [
            'headers' => [
                'Authorization' => 'Bearer ' . $this->openai_api_key,
                'Content-Type' => 'application/json'
            ],
            'body' => json_encode([
                'input' => $text,
                'model' => $this->embedding_model
            ]),
            'timeout' => 30
        ]);

        if (is_wp_error($response)) {
            return false;
        }

        $result = json_decode(wp_remote_retrieve_body($response), true);
        return $result['data'][0]['embedding'] ?? false;
    }

    /**
     * AJAX Handlers
     */

    public function get_status()
    {
        if (!wp_verify_nonce($_POST['nonce'], 'scqs_nonce')) {
            wp_send_json_error(['message' => 'Security check failed']);
        }

        $status = get_option('scqs_status', ['phase' => 'idle']);
        wp_send_json_success($status);
    }

    public function reset_sync()
    {
        if (!wp_verify_nonce($_POST['nonce'], 'scqs_nonce')) {
            wp_send_json_error(['message' => 'Security check failed']);
        }

        delete_option('scqs_status');
        delete_option('scqs_all_pages');
        delete_option('scqs_chunks');

        wp_send_json_success(['message' => 'Sync zurückgesetzt']);
    }

    public function test_search()
    {
        if (!wp_verify_nonce($_POST['nonce'], 'scqs_nonce')) {
            wp_send_json_error(['message' => 'Security check failed']);
        }

        $query = sanitize_text_field($_POST['query']);

        // Get query embedding
        $embedding = $this->get_single_embedding($query);
        if (!$embedding) {
            wp_die('<div style="color: red;">❌ Fehler beim Generieren des Embeddings</div>');
        }

        // Search
        $results = $this->search_qdrant($embedding, 3);

        if (empty($results)) {
            wp_die('<div style="color: orange;">⚠️ Keine Ergebnisse gefunden</div>');
        }

        echo '<div style="color: green;">✅ ' . count($results) . ' Ergebnisse:</div>';
        foreach ($results as $result) {
            $score = round($result['score'] * 100, 1);
            $payload = $result['payload'];

            echo '<div style="border: 1px solid #ddd; padding: 8px; margin: 5px 0; font-size: 12px;">';
            echo '<strong>' . ($payload['page_title'] ?? 'N/A') . '</strong> (' . $score . '%)<br>';
            echo substr($payload['content'] ?? '', 0, 150) . '...';
            echo '</div>';
        }

        wp_die();
    }

    /**
     * Log function
     */
    private function log($message)
    {
        $timestamp = date('H:i:s');
        $log_entry = "[$timestamp] SCQS: $message";

        error_log($log_entry);

        // Store in option (last 50 entries)
        $log = get_option('scqs_debug_log', []);
        $log[] = $log_entry;
        $log = array_slice($log, -50);
        update_option('scqs_debug_log', $log, false);
    }
}

// Initialize
new Simple_Confluence_Qdrant_Sync();

?>