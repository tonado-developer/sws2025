<?php

/**
 * Complete Custom Knowledge Management System - OPTIMIZED VERSION
 * - WordPress Hook Integration für AI Engine Pro
 * - Confluence Sync mit vollständiger API-Integration
 * - PDF Processing mit Text-Extraktion
 * - Dual Collection Management (AI Engine + Custom)
 * - Cronjob-basierte Batch-Verarbeitung
 * - Umfassende Debug- und Monitoring-Tools
 * - TIMEOUT-PROBLEME BEHOBEN
 * 
 * Installation: In functions.php includen:
 * require_once get_template_directory() . '/custom-knowledge-system.php';
 */

if (!defined('ABSPATH')) {
    exit;
}

class Custom_Knowledge_System
{
    private $openai_api_key;
    private $qdrant_url;
    private $qdrant_api_key;
    private $atlassian_base_url;
    private $atlassian_email;
    private $atlassian_token;

    // Collections
    private $ai_engine_collection = 'sws_ai_engine_pro';
    private $custom_collection = 'sws_custom_knowledge';

    // OPTIMIERTE Processing settings - DEUTLICH REDUZIERT
    private $pages_per_batch = 5;        // War: 25 -> Jetzt: 5
    private $embeddings_per_batch = 10;  // War: 50 -> Jetzt: 10
    private $confluence_api_batch = 25;  // War: 50 -> Jetzt: 25
    private $embedding_model = "text-embedding-3-small";
    private $embedding_dimensions = 1536;
    private $chunk_size = 800;
    private $max_chunk_overlap = 100;

    // Rate Limiting - NEU HINZUGEFÜGT
    private $confluence_delay = 3;       // Sekunden zwischen Confluence API Calls
    private $openai_delay = 2;          // Sekunden zwischen OpenAI API Calls
    private $max_retries = 3;           // Retry-Versuche
    
    // Timeouts - REDUZIERT
    private $confluence_timeout = 30;    // War: 60 -> Jetzt: 30
    private $openai_timeout = 60;       // War: 120 -> Jetzt: 60
    private $qdrant_timeout = 30;       // War: 120 -> Jetzt: 30
    
    // Memory Management - NEU
    private $use_transients = true;     // Nutze Transients statt Options
    private $chunk_memory_limit = 1000; // Max Chunks im Memory
    
    // Processing Control - NEU
    private $max_execution_time = 240;  // 4 Minuten max pro Cronjob
    private $progress_save_interval = 5; // Status alle 5 verarbeiteten Items speichern

    // AI Processing
    private $enable_ai_rewrite = true;
    private $rewrite_threshold = 1000;
    private $max_rewrite_attempts = 3;

    // Search settings
    private $search_limit = 5;
    private $score_threshold = 0.7;

    public function __construct()
    {
        // Execution Time Limit setzen
        if (!ini_get('safe_mode')) {
            set_time_limit($this->max_execution_time);
        }
        
        $this->load_settings();
        $this->init_hooks();
    }

    /**
     * Load all settings from WordPress options
     */
    private function load_settings()
    {
        $this->openai_api_key = get_option('cks_openai_key', '');
        $this->qdrant_url = get_option('cks_qdrant_url', 'http://localhost:6333');
        $this->qdrant_api_key = get_option('cks_qdrant_api_key', '');
        $this->atlassian_base_url = get_option('cks_atlassian_base_url', '');
        $this->atlassian_email = get_option('cks_atlassian_email', '');
        $this->atlassian_token = get_option('cks_atlassian_token', '');
        $this->enable_ai_rewrite = get_option('cks_enable_ai_rewrite', 0) == 1;
        $this->rewrite_threshold = get_option('cks_rewrite_threshold', 1500);
        $this->search_limit = get_option('cks_search_limit', 5);
        $this->score_threshold = get_option('cks_score_threshold', 0.7);
    }

    /**
     * Initialize all WordPress hooks
     */
    private function init_hooks()
    {
        // Core hooks
        add_action('init', [$this, 'init']);
        add_action('admin_menu', [$this, 'admin_menu']);
        add_action('admin_enqueue_scripts', [$this, 'admin_scripts']);

        // AI Engine Pro Integration Hook
        add_filter('mgl_ai_query_context', [$this, 'enhance_chatbot_context'], 10, 2);
        add_filter('mgl_ai_before_query', [$this, 'log_chatbot_query'], 10, 1);

        // AJAX Handlers - Admin
        add_action('wp_ajax_cks_start_confluence_sync', [$this, 'start_confluence_sync']);
        add_action('wp_ajax_cks_upload_pdf', [$this, 'upload_pdf']);
        add_action('wp_ajax_cks_process_pdf', [$this, 'process_pdf']);
        add_action('wp_ajax_cks_get_status', [$this, 'get_status']);
        add_action('wp_ajax_cks_reset_sync', [$this, 'reset_sync']);
        add_action('wp_ajax_cks_test_search', [$this, 'test_search']);
        add_action('wp_ajax_cks_debug_info', [$this, 'debug_info']);
        add_action('wp_ajax_cks_delete_document', [$this, 'delete_document']);
        add_action('wp_ajax_cks_reindex_document', [$this, 'reindex_document']);

        // Public cronjob endpoint
        add_action('wp_ajax_nopriv_cks_cronjob', [$this, 'cronjob_endpoint']);
        add_action('wp_ajax_cks_cronjob', [$this, 'cronjob_endpoint']);

        // File upload handling
        add_action('wp_loaded', [$this, 'handle_file_upload']);
    }

    public function init()
    {
        // Create upload directory for PDFs
        $this->ensure_upload_directory();

        // Initialize collections if needed
        if (get_option('cks_initialized') !== '1') {
            $this->initialize_collections();
        }

        // Check system requirements
        $this->check_system_requirements();
    }

    /**
     * Admin scripts and styles
     */
    public function admin_scripts($hook)
    {
        if (strpos($hook, 'custom-knowledge-system') === false) {
            return;
        }

        wp_enqueue_media();
        wp_enqueue_script('jquery');
    }

    /**
     * Ensure upload directory exists
     */
    private function ensure_upload_directory()
    {
        $upload_dir = wp_upload_dir();
        $cks_dir = $upload_dir['basedir'] . '/custom-knowledge/';

        if (!file_exists($cks_dir)) {
            wp_mkdir_p($cks_dir);

            // Create .htaccess for security
            $htaccess = $cks_dir . '.htaccess';
            if (!file_exists($htaccess)) {
                file_put_contents($htaccess, "deny from all\n");
            }
        }
    }

    /**
     * Check system requirements
     */
    private function check_system_requirements()
    {
        $requirements = [];

        if (!extension_loaded('curl')) {
            $requirements[] = 'cURL extension';
        }

        if (!class_exists('ZipArchive')) {
            $requirements[] = 'ZIP extension';
        }

        if (!function_exists('shell_exec')) {
            $requirements[] = 'shell_exec function (for PDF processing)';
        }

        if (!empty($requirements)) {
            $this->log("System requirements missing: " . implode(', ', $requirements));
        }
    }

    /**
     * Initialize both Qdrant collections
     */
    private function initialize_collections()
    {
        if (empty($this->qdrant_url)) {
            $this->log("Cannot initialize collections: Qdrant URL not configured");
            return false;
        }

        $collections = [
            $this->ai_engine_collection => 'AI Engine Pro WordPress Content',
            $this->custom_collection => 'Custom Knowledge (Confluence + PDFs)'
        ];

        $initialized_count = 0;

        foreach ($collections as $collection_name => $description) {
            $response = wp_remote_request($this->qdrant_url . '/collections/' . $collection_name, [
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
                $response_code = wp_remote_retrieve_response_code($response);
                if ($response_code === 200 || $response_code === 201) {
                    $this->log("Collection initialized: {$collection_name}");
                    $initialized_count++;
                } else {
                    $this->log("Failed to initialize {$collection_name}: HTTP {$response_code}");
                }
            } else {
                $this->log("Failed to initialize {$collection_name}: " . $response->get_error_message());
            }
        }

        if ($initialized_count === count($collections)) {
            update_option('cks_initialized', '1');
            $this->log("All collections initialized successfully");
            return true;
        }

        return false;
    }

    // ============================================================================
    // AI ENGINE PRO INTEGRATION
    // ============================================================================

    /**
     * Main hook: Enhance chatbot context with custom knowledge
     */
    public function enhance_chatbot_context($context, $query)
    {
        if (empty($query) || empty($this->openai_api_key)) {
            return $context;
        }

        $start_time = microtime(true);
        $this->log("Enhancing context for query: " . substr($query, 0, 50) . "...");

        try {
            // Search in custom knowledge collection
            $custom_results = $this->search_custom_knowledge($query, $this->search_limit);

            if (!empty($custom_results)) {
                $custom_context = $this->format_search_results_for_context($custom_results);

                // Add custom knowledge to existing context
                $separator = "\n\n" . str_repeat("=", 60) . "\n";
                $enhanced_context = $context . $separator . "ZUSÄTZLICHE INFORMATIONEN AUS CUSTOM KNOWLEDGE:\n\n" . $custom_context;

                $duration = round((microtime(true) - $start_time) * 1000, 2);
                $this->log("Enhanced context with " . count($custom_results) . " custom results ({$duration}ms)");

                return $enhanced_context;
            }
        } catch (Exception $e) {
            $this->log("Error enhancing context: " . $e->getMessage());
        }

        return $context;
    }

    /**
     * Log chatbot queries for analytics
     */
    public function log_chatbot_query($query)
    {
        if (!empty($query)) {
            $this->log("Chatbot Query: " . substr($query, 0, 100) . (strlen($query) > 100 ? '...' : ''));
        }
        return $query;
    }

    /**
     * Search in custom knowledge collection
     */
    private function search_custom_knowledge($query, $limit = 5)
    {
        // Get query embedding
        $embedding = $this->get_single_embedding($query);
        if (!$embedding) {
            throw new Exception('Failed to generate query embedding');
        }

        // Search in custom collection
        $response = wp_remote_post($this->qdrant_url . '/collections/' . $this->custom_collection . '/points/search', [
            'headers' => array_merge(
                ['Content-Type' => 'application/json'],
                $this->qdrant_api_key ? ['api-key' => $this->qdrant_api_key] : []
            ),
            'body' => json_encode([
                'vector' => $embedding,
                'limit' => $limit,
                'with_payload' => true,
                'score_threshold' => $this->score_threshold,
                'filter' => [
                    'must_not' => [
                        ['key' => 'status', 'match' => ['value' => 'deleted']]
                    ]
                ]
            ]),
            'timeout' => 15
        ]);

        if (is_wp_error($response)) {
            throw new Exception('Qdrant search failed: ' . $response->get_error_message());
        }

        $data = json_decode(wp_remote_retrieve_body($response), true);
        return $data['result'] ?? [];
    }

    /**
     * Format search results for chatbot context
     */
    private function format_search_results_for_context($results)
    {
        $context_parts = [];

        foreach ($results as $result) {
            $payload = $result['payload'];
            $score = round($result['score'] * 100, 1);

            $source_info = "";
            $source_type = $payload['source'] ?? 'unknown';

            switch ($source_type) {
                case 'confluence':
                    $space = $payload['space_key'] ?? 'Unknown Space';
                    $title = $payload['title'] ?? 'Untitled';
                    $source_info = "📄 Confluence: {$space} - {$title}";
                    if (isset($payload['url'])) {
                        $source_info .= "\n🔗 " . $payload['url'];
                    }
                    break;

                case 'pdf':
                    $filename = $payload['filename'] ?? 'Dokument';
                    $page = isset($payload['page_number']) ? " (Seite {$payload['page_number']})" : '';
                    $source_info = "📋 PDF: {$filename}{$page}";
                    break;

                default:
                    $source_info = "📎 Dokument: " . ($payload['title'] ?? 'Unbekannt');
            }

            $content = $payload['content'] ?? '';

            // Limit content length for context
            if (strlen($content) > 500) {
                $content = substr($content, 0, 500) . '...';
            }

            $context_parts[] = "{$source_info}\n{$content}";
        }

        return implode("\n\n" . str_repeat("-", 40) . "\n\n", $context_parts);
    }

    // ============================================================================
    // ADMIN INTERFACE
    // ============================================================================

    public function admin_menu()
    {
        add_options_page(
            'Custom Knowledge System',
            'Custom Knowledge',
            'manage_options',
            'custom-knowledge-system',
            [$this, 'admin_page']
        );
    }

    public function admin_page()
    {
        // Save settings
        if (isset($_POST['save_settings'])) {
            $this->save_admin_settings();
            echo '<div class="notice notice-success"><p>Einstellungen gespeichert!</p></div>';
        }

        // Get current status and stats
        $status = get_option('cks_status', ['phase' => 'idle']);
        $is_running = in_array($status['phase'], ['fetching', 'processing', 'embedding', 'pdf_processing']);

        $custom_stats = $this->get_collection_info($this->custom_collection);
        $ai_engine_stats = $this->get_collection_info($this->ai_engine_collection);

        // Get recent documents
        $recent_docs = $this->get_recent_documents();

        $this->render_admin_page($status, $is_running, $custom_stats, $ai_engine_stats, $recent_docs);
    }

    private function save_admin_settings()
    {
        $settings = [
            'cks_openai_key' => sanitize_text_field($_POST['openai_key'] ?? ''),
            'cks_qdrant_url' => esc_url_raw($_POST['qdrant_url'] ?? ''),
            'cks_qdrant_api_key' => sanitize_text_field($_POST['qdrant_api_key'] ?? ''),
            'cks_atlassian_base_url' => esc_url_raw($_POST['atlassian_base_url'] ?? ''),
            'cks_atlassian_email' => sanitize_email($_POST['atlassian_email'] ?? ''),
            'cks_atlassian_token' => sanitize_text_field($_POST['atlassian_token'] ?? ''),
            'cks_enable_ai_rewrite' => isset($_POST['enable_ai_rewrite']) ? 1 : 0,
            'cks_rewrite_threshold' => intval($_POST['rewrite_threshold'] ?? 1500),
            'cks_search_limit' => intval($_POST['search_limit'] ?? 5),
            'cks_score_threshold' => floatval($_POST['score_threshold'] ?? 0.7)
        ];

        foreach ($settings as $option => $value) {
            update_option($option, $value);
        }

        $this->load_settings(); // Reload settings
    }

    private function get_recent_documents($limit = 10)
    {
        // Mock implementation - in real system would query Qdrant or maintain document registry
        return [];
    }

    private function render_admin_page($status, $is_running, $custom_stats, $ai_engine_stats, $recent_docs)
    {
?>
        <div class="wrap">
            <h1>Custom Knowledge Management System</h1>

            <!-- OPTIMIERUNG HINWEIS -->
            <div style="background: #fff8e1; border: 1px solid #ffcc02; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h4>🚀 System optimiert für bessere Performance</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div>
                        <strong>Batch-Größen:</strong><br>
                        Pages: <?= $this->pages_per_batch ?> (war: 25)<br>
                        Embeddings: <?= $this->embeddings_per_batch ?> (war: 50)
                    </div>
                    <div>
                        <strong>Rate Limiting:</strong><br>
                        Confluence: <?= $this->confluence_delay ?>s<br>
                        OpenAI: <?= $this->openai_delay ?>s
                    </div>
                    <div>
                        <strong>Timeouts:</strong><br>
                        Max Execution: <?= $this->max_execution_time ?>s<br>
                        API Timeout: <?= $this->confluence_timeout ?>s
                    </div>
                    <div>
                        <strong>Storage:</strong><br>
                        Using Transients: <?= $this->use_transients ? 'Ja' : 'Nein' ?><br>
                        Retry Attempts: <?= $this->max_retries ?>
                    </div>
                </div>
                <p style="margin-top: 10px; color: #d63638;"><strong>Empfehlung:</strong> Cronjob auf alle 5 Minuten stellen statt alle 2 Minuten</p>
            </div>

            <!-- System Status -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0;">

                <div style="background: #fff; padding: 20px; border-left: 4px solid #0073aa; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 10px 0; color: #0073aa;">AI Engine Pro Collection</h3>
                    <p><strong>Collection:</strong> <?= $this->ai_engine_collection ?></p>
                    <p><strong>Embeddings:</strong> <?= $ai_engine_stats ? number_format($ai_engine_stats['points_count']) : '0' ?></p>
                    <p><strong>Status:</strong> <span style="color: #00a32a;">Automatisch verwaltet</span></p>
                </div>

                <div style="background: #fff; padding: 20px; border-left: 4px solid #00a32a; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 10px 0; color: #00a32a;">Custom Knowledge Collection</h3>
                    <p><strong>Collection:</strong> <?= $this->custom_collection ?></p>
                    <p><strong>Embeddings:</strong> <?= $custom_stats ? number_format($custom_stats['points_count']) : '0' ?></p>
                    <p><strong>Quellen:</strong> Confluence + PDFs</p>
                </div>

                <div style="background: #fff; padding: 20px; border-left: 4px solid #d63638; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 10px 0; color: #d63638;">System Health</h3>
                    <?php
                    $health = $this->check_system_health();
                    foreach ($health as $check => $status_ok) {
                        $color = $status_ok ? '#00a32a' : '#d63638';
                        $icon = $status_ok ? '✓' : '✗';
                        echo "<p style='color: {$color};'>{$icon} {$check}</p>";
                    }
                    ?>
                </div>

            </div>

            <!-- Active Sync Status -->
            <?php if ($is_running): ?>
                <div style="background: #fff8e1; border: 1px solid #ffcc02; padding: 20px; margin: 20px 0; border-radius: 5px;">
                    <h3>Verarbeitung läuft...</h3>
                    <div style="background: #f0f0f0; height: 20px; border-radius: 10px; overflow: hidden;">
                        <?php
                        $percent = 0;
                        if (isset($status['total']) && $status['total'] > 0) {
                            $percent = ($status['processed'] / $status['total']) * 100;
                        }
                        ?>
                        <div style="background: #4CAF50; height: 100%; width: <?= $percent ?>%; transition: width 0.3s;"></div>
                    </div>
                    <p style="margin-top: 10px;">
                        <strong>Phase:</strong> <?= $status['phase'] ?><br>
                        <strong>Fortschritt:</strong> <?= $status['processed'] ?? 0 ?>/<?= $status['total'] ?? '?' ?><br>
                        <strong>Status:</strong> <?= $status['message'] ?? 'Verarbeitung...' ?><br>
                        <strong>Letztes Update:</strong> <?= date('H:i:s', $status['last_update'] ?? time()) ?>
                    </p>
                    <button id="refresh-status" class="button">Status aktualisieren</button>
                    <button id="reset-sync" class="button button-secondary">Verarbeitung stoppen</button>
                </div>
            <?php endif; ?>

            <!-- Configuration -->
            <div style="background: #fff; padding: 20px; margin: 20px 0; border: 1px solid #ddd;">
                <h3>API Konfiguration</h3>
                <form method="post">
                    <table class="form-table">
                        <tr>
                            <th colspan="2">
                                <h4>OpenAI</h4>
                            </th>
                        </tr>
                        <tr>
                            <th>API Key</th>
                            <td><input type="password" name="openai_key" value="<?= esc_attr($this->openai_api_key) ?>" style="width: 400px;" placeholder="sk-..."></td>
                        </tr>

                        <tr>
                            <th colspan="2">
                                <h4>Qdrant Vector Database</h4>
                            </th>
                        </tr>
                        <tr>
                            <th>URL</th>
                            <td><input type="url" name="qdrant_url" value="<?= esc_attr($this->qdrant_url) ?>" style="width: 400px;" placeholder="http://localhost:6333"></td>
                        </tr>
                        <tr>
                            <th>API Key (optional)</th>
                            <td><input type="password" name="qdrant_api_key" value="<?= esc_attr($this->qdrant_api_key) ?>" style="width: 400px;"></td>
                        </tr>

                        <tr>
                            <th colspan="2">
                                <h4>Confluence Integration</h4>
                            </th>
                        </tr>
                        <tr>
                            <th>Base URL</th>
                            <td><input type="url" name="atlassian_base_url" value="<?= esc_attr($this->atlassian_base_url) ?>" style="width: 400px;" placeholder="https://company.atlassian.net/wiki"></td>
                        </tr>
                        <tr>
                            <th>Email</th>
                            <td><input type="email" name="atlassian_email" value="<?= esc_attr($this->atlassian_email) ?>" style="width: 400px;"></td>
                        </tr>
                        <tr>
                            <th>API Token</th>
                            <td><input type="password" name="atlassian_token" value="<?= esc_attr($this->atlassian_token) ?>" style="width: 400px;"></td>
                        </tr>

                        <tr>
                            <th colspan="2">
                                <h4>Search Einstellungen</h4>
                            </th>
                        </tr>
                        <tr>
                            <th>Anzahl Suchergebnisse</th>
                            <td><input type="number" name="search_limit" value="<?= $this->search_limit ?>" min="1" max="20" style="width: 100px;"></td>
                        </tr>
                        <tr>
                            <th>Relevanz-Schwellwert</th>
                            <td><input type="number" name="score_threshold" value="<?= $this->score_threshold ?>" min="0" max="1" step="0.1" style="width: 100px;"> (0.0 - 1.0)</td>
                        </tr>

                        <tr>
                            <th colspan="2">
                                <h4>AI Content Optimierung</h4>
                            </th>
                        </tr>
                        <tr>
                            <th>AI Rewrite aktivieren</th>
                            <td>
                                <input type="checkbox" name="enable_ai_rewrite" value="1" <?= $this->enable_ai_rewrite ? 'checked' : '' ?>>
                                <small>Optimiert Inhalte für bessere Embedding-Qualität</small>
                            </td>
                        </tr>
                        <tr>
                            <th>Min. Textlänge für Rewrite</th>
                            <td><input type="number" name="rewrite_threshold" value="<?= $this->rewrite_threshold ?>" min="500" max="5000" step="100" style="width: 100px;"> Zeichen</td>
                        </tr>
                    </table>
                    <input type="submit" name="save_settings" class="button-primary" value="Konfiguration speichern">
                </form>
            </div>

            <!-- Actions -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0;">

                <div style="background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <h3>Confluence Synchronisation</h3>
                    <p>Importiert alle Confluence-Seiten in die Custom Knowledge Collection.</p>
                    <button id="start-confluence-sync" class="button-primary" <?= $is_running ? 'disabled' : '' ?>>
                        Confluence Sync starten
                    </button>
                    <div id="confluence-result" style="margin-top: 10px;"></div>
                </div>

                <div style="background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <h3>PDF Upload & Processing</h3>
                    <p>Lade mehrere PDF-Dateien hoch und extrahiere automatisch den Text.</p>
                    <input type="file" id="pdf-files" accept=".pdf" multiple style="width: 100%; margin-bottom: 10px;">
                    <button id="upload-pdf" class="button">PDFs hochladen & verarbeiten</button>
                    <div id="pdf-result" style="margin-top: 10px;"></div>
                    <div id="pdf-progress" style="margin-top: 10px; display: none;">
                        <div style="background: #f0f0f0; height: 20px; border-radius: 10px; overflow: hidden;">
                            <div id="pdf-progress-bar" style="background: #4CAF50; height: 100%; width: 0%; transition: width 0.3s;"></div>
                        </div>
                        <p id="pdf-progress-text" style="margin-top: 5px; font-size: 12px;"></p>
                    </div>
                </div>

                <div style="background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <h3>Knowledge Search Test</h3>
                    <p>Teste die Suche in der Custom Knowledge Collection.</p>
                    <input type="text" id="search-query" placeholder="Suchbegriff eingeben..." style="width: 100%; margin-bottom: 10px;">
                    <button id="test-search" class="button">Suche testen</button>
                    <div id="search-results" style="margin-top: 10px; max-height: 300px; overflow-y: auto;"></div>
                </div>

            </div>

            <!-- System Tools -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0;">

                <div style="background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <h3>Cronjob Setup (OPTIMIERT)</h3>
                    <p><strong>Plesk Cronjob URL:</strong></p>
                    <code style="background: #f0f0f0; padding: 8px; display: block; word-break: break-all; margin: 10px 0;">
                        <?= admin_url('admin-ajax.php?action=cks_cronjob') ?>
                    </code>
                    <p><strong>EMPFOHLENER Befehl (alle 5 Minuten mit Timeout):</strong></p>
                    <code style="background: #f0f0f0; padding: 8px; display: block; word-break: break-all;">
                        */5 * * * * timeout 240s curl -s "<?= admin_url('admin-ajax.php?action=cks_cronjob') ?>" >/dev/null 2>&1
                    </code>
                    <p style="color: #d63638; font-size: 12px;"><strong>WICHTIG:</strong> Auf 5 Minuten geändert für bessere Performance!</p>
                </div>

                <div style="background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <h3>System Tools</h3>
                    <button id="debug-info" class="button">System Debug Info</button><br><br>
                    <button id="test-connection" class="button">Verbindungen testen</button><br><br>
                    <button id="reset-all" class="button button-secondary">System zurücksetzen</button>
                    <div id="debug-result" style="margin-top: 10px; font-family: monospace; font-size: 12px; max-height: 300px; overflow-y: auto;"></div>
                </div>

            </div>

            <!-- Activity Log -->
            <div style="background: #fff; padding: 20px; margin: 20px 0; border: 1px solid #ddd; border-radius: 5px;">
                <h3>System Activity Log</h3>
                <div id="activity-log" style="background: #f4f4f4; padding: 15px; font-family: monospace; font-size: 12px; max-height: 300px; overflow-y: auto; border-radius: 3px;">
                    <?php
                    $log = get_option('cks_debug_log', []);
                    if (!empty($log)) {
                        echo implode("<br>", array_slice($log, -25));
                    } else {
                        echo "<em>Keine Log-Einträge vorhanden.</em>";
                    }
                    ?>
                </div>
                <button id="refresh-log" class="button button-small" style="margin-top: 10px;">Log aktualisieren</button>
                <button id="clear-log" class="button button-small">Log leeren</button>
            </div>
        </div>

        <script>
            jQuery(document).ready(function($) {
                const nonce = '<?= wp_create_nonce('cks_nonce') ?>';

                // Confluence Sync
                $('#start-confluence-sync').on('click', function() {
                    if (!confirm('Confluence Synchronisation starten?\n\nStelle sicher, dass der Cronjob auf alle 5 Minuten eingerichtet ist (NICHT 2 Minuten).')) return;

                    const button = $(this);
                    button.prop('disabled', true).text('Starte Synchronisation...');

                    $.post(ajaxurl, {
                        action: 'cks_start_confluence_sync',
                        nonce: nonce
                    }, function(response) {
                        if (response.success) {
                            $('#confluence-result').html('<div style="color: green; padding: 10px; background: #f0f8f0; border-radius: 3px;">' + response.data.message + '</div>');
                            setTimeout(() => location.reload(), 3000);
                        } else {
                            $('#confluence-result').html('<div style="color: red; padding: 10px; background: #f8f0f0; border-radius: 3px;">' + response.data.message + '</div>');
                            button.prop('disabled', false).text('Confluence Sync starten');
                        }
                    }).fail(function() {
                        $('#confluence-result').html('<div style="color: red;">Fehler bei der Anfrage</div>');
                        button.prop('disabled', false).text('Confluence Sync starten');
                    });
                });

                // PDF Upload
                $('#upload-pdf').on('click', function() {
                    const files = $('#pdf-files')[0].files;
                    if (files.length === 0) {
                        alert('Bitte wähle mindestens eine PDF-Datei aus.');
                        return;
                    }

                    // Check file sizes
                    let totalSize = 0;
                    for (let i = 0; i < files.length; i++) {
                        totalSize += files[i].size;
                        if (files[i].size > 50 * 1024 * 1024) { // 50MB per file
                            alert('Datei "' + files[i].name + '" ist zu groß (max. 50MB pro Datei).');
                            return;
                        }
                    }

                    if (totalSize > 200 * 1024 * 1024) { // 200MB total
                        alert('Gesamtgröße zu groß (max. 200MB gesamt).');
                        return;
                    }

                    const button = $(this);
                    button.prop('disabled', true).text('Upload läuft...');
                    $('#pdf-progress').show();

                    uploadPDFsSequentially(files, 0);
                });

                function uploadPDFsSequentially(files, index) {
                    if (index >= files.length) {
                        $('#upload-pdf').prop('disabled', false).text('PDFs hochladen & verarbeiten');
                        $('#pdf-progress').hide();
                        $('#pdf-result').append('<div style="color: green; margin-top: 10px;">Alle PDFs erfolgreich verarbeitet!</div>');
                        return;
                    }

                    const file = files[index];
                    const percent = Math.round(((index + 1) / files.length) * 100);

                    $('#pdf-progress-bar').css('width', percent + '%');
                    $('#pdf-progress-text').text(`Verarbeite ${index + 1}/${files.length}: ${file.name}`);

                    const formData = new FormData();
                    formData.append('action', 'cks_upload_pdf');
                    formData.append('nonce', nonce);
                    formData.append('pdf_file', file);

                    $.ajax({
                        url: ajaxurl,
                        type: 'POST',
                        data: formData,
                        processData: false,
                        contentType: false,
                        timeout: 120000,
                        success: function(response) {
                            if (response.success) {
                                $('#pdf-result').append('<div style="color: green; font-size: 12px;">✓ ' + file.name + ': ' + response.data.message + '</div>');
                            } else {
                                $('#pdf-result').append('<div style="color: red; font-size: 12px;">✗ ' + file.name + ': ' + response.data.message + '</div>');
                            }
                            uploadPDFsSequentially(files, index + 1);
                        },
                        error: function() {
                            $('#pdf-result').append('<div style="color: red; font-size: 12px;">✗ ' + file.name + ': Upload-Fehler</div>');
                            uploadPDFsSequentially(files, index + 1);
                        }
                    });
                }

                // Search Test
                $('#test-search').on('click', function() {
                    const query = $('#search-query').val().trim();
                    if (!query) {
                        alert('Bitte gib einen Suchbegriff ein.');
                        return;
                    }

                    $('#search-results').html('<div style="color: orange; text-align: center; padding: 20px;">🔍 Suche läuft...</div>');

                    $.post(ajaxurl, {
                        action: 'cks_test_search',
                        query: query,
                        nonce: nonce
                    }, function(response) {
                        $('#search-results').html(response);
                    }).fail(function() {
                        $('#search-results').html('<div style="color: red;">Fehler bei der Suche</div>');
                    });
                });

                // Debug Info
                $('#debug-info').on('click', function() {
                    $('#debug-result').html('<div style="color: orange;">Lade Debug-Informationen...</div>');

                    $.post(ajaxurl, {
                        action: 'cks_debug_info',
                        nonce: nonce
                    }, function(response) {
                        $('#debug-result').html(response);
                    });
                });

                // Test Connection
                $('#test-connection').on('click', function() {
                    $('#debug-result').html('<div style="color: orange;">Teste Verbindungen...</div>');

                    $.post(ajaxurl, {
                        action: 'cks_debug_info',
                        test_connections: 1,
                        nonce: nonce
                    }, function(response) {
                        $('#debug-result').html(response);
                    });
                });

                // System Reset
                $('#reset-all').on('click', function() {
                    if (!confirm('Wirklich das gesamte System zurücksetzen?\n\nDies löscht alle temporären Daten und stoppt laufende Prozesse.')) return;

                    $.post(ajaxurl, {
                        action: 'cks_reset_sync',
                        nonce: nonce
                    }, function(response) {
                        if (response.success) {
                            location.reload();
                        } else {
                            alert('Fehler beim Zurücksetzen: ' + response.data.message);
                        }
                    });
                });

                // Log Management
                $('#refresh-log').on('click', function() {
                    location.reload();
                });

                $('#clear-log').on('click', function() {
                    if (confirm('Activity Log wirklich leeren?')) {
                        $.post(ajaxurl, {
                            action: 'cks_reset_sync',
                            clear_log: 1,
                            nonce: nonce
                        }, function(response) {
                            $('#activity-log').html('<em>Log geleert.</em>');
                        });
                    }
                });

                // Auto-refresh for running processes
                <?php if ($is_running): ?>
                    setInterval(function() {
                        $.post(ajaxurl, {
                            action: 'cks_get_status',
                            nonce: nonce
                        }, function(response) {
                            if (response.success && response.data) {
                                const status = response.data;
                                if (status.phase === 'completed' || status.phase === 'error' || status.phase === 'idle') {
                                    location.reload();
                                }
                            }
                        });
                    }, 5000); // Check every 5 seconds
                <?php endif; ?>
            });
        </script>
<?php
    }

    // ============================================================================
    // CONFLUENCE INTEGRATION - OPTIMIERT
    // ============================================================================

    public function start_confluence_sync()
    {
        if (!wp_verify_nonce($_POST['nonce'], 'cks_nonce')) {
            wp_send_json_error(['message' => 'Security check failed']);
        }

        // Validate required settings
        if (empty($this->atlassian_base_url)) {
            wp_send_json_error(['message' => 'Confluence API-Konfiguration unvollständig']);
        }

        if (empty($this->openai_api_key)) {
            wp_send_json_error(['message' => 'OpenAI API-Key fehlt']);
        }

        $status = get_option('cks_status', ['phase' => 'idle']);
        if ($status['phase'] !== 'idle') {
            wp_send_json_error(['message' => 'Ein Sync-Prozess läuft bereits']);
        }

        // Reset status and start sync
        update_option('cks_status', [
            'phase' => 'fetching',
            'message' => 'Confluence-Synchronisation gestartet (optimiert)',
            'last_update' => time(),
            'start_time' => time(),
            'processed' => 0,
            'total' => 0,
            'source' => 'confluence',
            'fetched_total' => 0
        ]);

        // Clear old data
        $this->clear_stored_data();

        $this->log("Confluence sync started by user (OPTIMIZED VERSION)");

        wp_send_json_success(['message' => 'Confluence-Sync gestartet. Der Cronjob (alle 5 Minuten) übernimmt die weitere Verarbeitung.']);
    }

    // ============================================================================
    // OPTIMIERTE CRONJOB PROCESSING SYSTEM
    // ============================================================================

    public function cronjob_endpoint()
    {
        // Execution Time Limit setzen
        if (!ini_get('safe_mode')) {
            set_time_limit($this->max_execution_time);
        }

        $this->log("=== OPTIMIZED CRONJOB EXECUTION START ===");

        $status = get_option('cks_status', ['phase' => 'idle']);

        // Check if any process is running
        if (!in_array($status['phase'], ['fetching', 'processing', 'embedding', 'pdf_processing'])) {
            $this->log("No active process found. Status: " . ($status['phase'] ?? 'unknown'));
            wp_die('No active process');
        }

        // Check for timeout (30 minutes statt 1 Stunde)
        $last_update = $status['last_update'] ?? time();
        if ((time() - $last_update) > 1800) { // 30 minutes
            $this->log("Process timeout detected (30min). Resetting to idle.");
            update_option('cks_status', [
                'phase' => 'error',
                'message' => 'Prozess-Timeout (über 30 Minuten inaktiv)',
                'last_update' => time()
            ]);
            wp_die('Process timeout');
        }

        try {
            $source = $status['source'] ?? 'confluence';

            switch ($status['phase']) {
                case 'fetching':
                    if ($source === 'confluence') {
                        $this->fetch_confluence_pages_optimized();
                    }
                    break;

                case 'processing':
                    $this->process_content_batch_optimized();
                    break;

                case 'embedding':
                    $this->process_embedding_batch_optimized();
                    break;

                case 'pdf_processing':
                    $this->process_pdf_batch();
                    break;

                default:
                    $this->log("Unknown process phase: " . $status['phase']);
            }
        } catch (Exception $e) {
            $this->log("Cronjob error: " . $e->getMessage());
            update_option('cks_status', [
                'phase' => 'error',
                'message' => 'Fehler: ' . $e->getMessage(),
                'last_update' => time()
            ]);
        }

        $this->log("=== OPTIMIZED CRONJOB EXECUTION END ===");
        wp_die('OK');
    }

    private function fetch_confluence_pages_optimized()
    {
        $this->log("Fetching Confluence pages with optimized batching...");
        
        $execution_start = microtime(true);
        $all_pages = $this->get_stored_pages();
        $start = count($all_pages);
        $limit = $this->confluence_api_batch;
        $fetched_this_run = 0;
        $max_pages_per_run = 100; // Maximum pages per cronjob run

        $headers = [
            'Accept' => 'application/json',
            'Content-Type' => 'application/json'
        ];

        while ($fetched_this_run < $max_pages_per_run) {
            // Check execution time
            if ((microtime(true) - $execution_start) > ($this->max_execution_time - 30)) {
                $this->log("Approaching time limit. Saving progress and continuing next run.");
                break;
            }

            $url = $this->atlassian_base_url . "/rest/api/content?" . http_build_query([
                'type' => 'page',
                'status' => 'current',
                'expand' => 'body.storage,space,version',
                'limit' => $limit,
                'start' => $start
            ]);

            $this->log("Fetching batch: start={$start}, limit={$limit}");

            // API Request mit Retry-Logic
            $batch_pages = $this->confluence_api_request($url, $headers);
            
            if (empty($batch_pages)) {
                $this->log("No more pages found. Moving to processing phase.");
                break;
            }

            $all_pages = array_merge($all_pages, $batch_pages);
            $fetched_this_run += count($batch_pages);
            $start += count($batch_pages);

            $this->log("Fetched " . count($batch_pages) . " pages. Total: " . count($all_pages) . ", This run: {$fetched_this_run}");

            // Store progress frequently
            $this->store_pages($all_pages);
            
            // Rate limiting
            sleep($this->confluence_delay);

            // If we got less than expected, we're at the end
            if (count($batch_pages) < $limit) {
                $this->log("Reached end of pages.");
                break;
            }
        }

        if ($fetched_this_run === 0 && !empty($all_pages)) {
            // No new pages fetched but we have pages - move to processing
            $this->start_processing_phase($all_pages);
        } else {
            // Update status for next run
            $status = get_option('cks_status', []);
            $status['message'] = count($all_pages) . " pages fetched so far, continuing next run...";
            $status['fetched_total'] = count($all_pages);
            $status['last_update'] = time();
            update_option('cks_status', $status);
        }
    }

    private function confluence_api_request($url, $headers)
    {
        $attempts = 0;
        
        while ($attempts < $this->max_retries) {
            $response = wp_remote_get($url, [
                'headers' => $headers,
                'timeout' => $this->confluence_timeout
            ]);

            if (!is_wp_error($response)) {
                $response_code = wp_remote_retrieve_response_code($response);
                
                if ($response_code === 200) {
                    $data = json_decode(wp_remote_retrieve_body($response), true);
                    return $data['results'] ?? [];
                }
                
                if ($response_code === 429) {
                    // Rate limited - wait longer
                    $wait_time = pow(2, $attempts) * 5; // Exponential backoff
                    $this->log("Rate limited. Waiting {$wait_time} seconds...");
                    sleep($wait_time);
                    $attempts++;
                    continue;
                }
                
                $this->log("Confluence API returned status {$response_code}");
                return [];
            }
            
            $attempts++;
            $this->log("Confluence API attempt {$attempts} failed: " . $response->get_error_message());
            
            if ($attempts < $this->max_retries) {
                sleep(pow(2, $attempts)); // Exponential backoff
            }
        }
        
        throw new Exception('Confluence API failed after ' . $this->max_retries . ' attempts');
    }

    private function start_processing_phase($all_pages)
    {
        update_option('cks_status', [
            'phase' => 'processing',
            'total' => count($all_pages),
            'processed' => 0,
            'message' => count($all_pages) . ' Confluence pages ready for processing',
            'last_update' => time(),
            'source' => 'confluence'
        ]);
        
        $this->log("Starting processing phase with " . count($all_pages) . " pages");
    }

    private function process_content_batch_optimized()
    {
        $execution_start = microtime(true);
        $status = get_option('cks_status');
        $all_pages = $this->get_stored_pages();
        $processed = $status['processed'] ?? 0;

        $this->log("Processing content batch starting at index: $processed");

        if (empty($all_pages)) {
            throw new Exception('No pages data found for processing');
        }

        $batch = array_slice($all_pages, $processed, $this->pages_per_batch);
        if (empty($batch)) {
            $this->start_embedding_phase();
            return;
        }

        $existing_chunks = $this->get_stored_chunks();
        $processed_count = 0;

        foreach ($batch as $page) {
            // Check execution time
            if ((microtime(true) - $execution_start) > ($this->max_execution_time - 60)) {
                $this->log("Time limit approaching. Saving progress.");
                break;
            }

            try {
                $chunks = $this->process_confluence_page($page);
                $existing_chunks = array_merge($existing_chunks, $chunks);
                $processed_count++;
                
                $this->log("Processed page: " . ($page['title'] ?? 'Untitled') . " -> " . count($chunks) . " chunks");
                
                // Save progress every few items
                if ($processed_count % $this->progress_save_interval === 0) {
                    $this->store_chunks($existing_chunks);
                    $new_processed = $processed + $processed_count;
                    $this->update_processing_status($new_processed, $status['total'], count($existing_chunks));
                }
                
            } catch (Exception $e) {
                $this->log("Error processing page " . ($page['id'] ?? 'unknown') . ": " . $e->getMessage());
            }
        }

        // Final save
        $this->store_chunks($existing_chunks);
        $new_processed = $processed + $processed_count;
        $this->update_processing_status($new_processed, $status['total'], count($existing_chunks));
    }

    private function update_processing_status($processed, $total, $chunk_count)
    {
        $status = get_option('cks_status', []);
        $status['processed'] = $processed;
        $status['message'] = "Content processing: {$processed}/{$total} pages ({$chunk_count} chunks created)";
        $status['last_update'] = time();
        update_option('cks_status', $status);
    }

    private function process_confluence_page($page)
    {
        $title = $page['title'] ?? 'Untitled';
        $page_id = $page['id'] ?? '';
        $space_key = $page['space']['key'] ?? '';
        $space_name = $page['space']['name'] ?? '';

        // Build Confluence URL
        $confluence_url = $this->build_confluence_url($page);

        // Extract and clean content
        $content = $this->extract_content_from_confluence($page);

        if (strlen($content) < 100) {
            $this->log("Skipping page '{$title}' - content too short (" . strlen($content) . " chars)");
            return [];
        }

        // AI content optimization if enabled
        if ($this->enable_ai_rewrite && strlen($content) > $this->rewrite_threshold) {
            $optimized_content = $this->optimize_content_with_ai($content, $title);
            if ($optimized_content) {
                $this->log("AI-optimized content for '{$title}' - reduced from " . strlen($content) . " to " . strlen($optimized_content) . " chars");
                $content = $optimized_content;
            }
        }

        // Create content chunks
        $chunks = $this->create_smart_chunks($content);

        $processed_chunks = [];
        foreach ($chunks as $i => $chunk_text) {
            $processed_chunks[] = [
                'content' => $chunk_text,
                'metadata' => [
                    'source' => 'confluence',
                    'page_id' => $page_id,
                    'title' => $title,
                    'space_key' => $space_key,
                    'space_name' => $space_name,
                    'url' => $confluence_url,
                    'chunk_index' => $i,
                    'total_chunks' => count($chunks),
                    'created_at' => date('Y-m-d H:i:s'),
                    'version' => $page['version']['number'] ?? 1
                ]
            ];
        }

        return $processed_chunks;
    }

    private function build_confluence_url($page)
    {
        $space_key = $page['space']['key'] ?? '';
        $page_id = $page['id'] ?? '';
        $title_slug = $this->create_url_slug($page['title'] ?? '');

        return "{$this->atlassian_base_url}/spaces/{$space_key}/pages/{$page_id}/{$title_slug}";
    }

    private function create_url_slug($title)
    {
        // Convert to URL-safe format
        $slug = str_replace(' ', '+', $title);
        return urlencode($slug);
    }

    private function extract_content_from_confluence($page)
    {
        $title = $page['title'] ?? '';
        $body = $page['body']['storage']['value'] ?? '';

        if (empty($body)) {
            return $title;
        }

        // Process Confluence storage format
        $content = $this->process_confluence_storage_format($body);

        // Add title and metadata
        $final_content = "# {$title}\n\n{$content}";

        return trim($final_content);
    }

    private function process_confluence_storage_format($html)
    {
        // Remove Confluence macros that don't add value
        $patterns_to_remove = [
            '/<ac:structured-macro ac:name="toc"[^>]*>.*?<\/ac:structured-macro>/s',
            '/<ac:structured-macro ac:name="include"[^>]*>.*?<\/ac:structured-macro>/s',
            '/<ac:structured-macro ac:name="contentbylabel"[^>]*>.*?<\/ac:structured-macro>/s',
            '/<ac:layout[^>]*>/',
            '/<\/ac:layout>/',
            '/<ac:layout-section[^>]*>/',
            '/<\/ac:layout-section>/',
            '/<ac:layout-cell[^>]*>/',
            '/<\/ac:layout-cell>/'
        ];

        foreach ($patterns_to_remove as $pattern) {
            $html = preg_replace($pattern, '', $html);
        }

        // Process info/warning/note macros
        $html = preg_replace_callback('/<ac:structured-macro ac:name="(info|note|warning|tip)"[^>]*>(.*?)<\/ac:structured-macro>/s', function ($matches) {
            $type = strtoupper($matches[1]);
            $content = strip_tags($matches[2]);
            return "\n\n**{$type}:** {$content}\n\n";
        }, $html);

        // Process tables
        $html = $this->process_html_tables($html);

        // Convert other HTML to readable text
        $html = $this->html_to_readable_text($html);

        return $html;
    }

    private function process_html_tables($html)
    {
        return preg_replace_callback('/<table[^>]*>(.*?)<\/table>/s', function ($matches) {
            $table_content = $matches[1];

            // Extract table rows
            preg_match_all('/<tr[^>]*>(.*?)<\/tr>/s', $table_content, $rows);

            $markdown_table = "\n\n";
            $is_first_row = true;

            foreach ($rows[1] as $row_content) {
                preg_match_all('/<t[hd][^>]*>(.*?)<\/t[hd]>/s', $row_content, $cells);

                $row_data = [];
                foreach ($cells[1] as $cell) {
                    $cell_text = strip_tags($cell);
                    $cell_text = html_entity_decode($cell_text, ENT_QUOTES, 'UTF-8');
                    $cell_text = preg_replace('/\s+/', ' ', trim($cell_text));
                    $row_data[] = $cell_text ?: ' ';
                }

                if (!empty($row_data)) {
                    $markdown_table .= "| " . implode(" | ", $row_data) . " |\n";

                    // Add header separator for first row
                    if ($is_first_row) {
                        $separator = array_fill(0, count($row_data), "---");
                        $markdown_table .= "| " . implode(" | ", $separator) . " |\n";
                        $is_first_row = false;
                    }
                }
            }

            return $markdown_table . "\n\n";
        }, $html);
    }

    private function html_to_readable_text($html)
    {
        // Convert headings
        $html = preg_replace('/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/s', "\n\n## $2\n\n", $html);

        // Convert paragraphs
        $html = preg_replace('/<p[^>]*>/', "\n\n", $html);
        $html = preg_replace('/<\/p>/', "", $html);

        // Convert line breaks
        $html = preg_replace('/<br\s*\/?>/i', "\n", $html);

        // Convert lists
        $html = preg_replace('/<li[^>]*>(.*?)<\/li>/s', "• $1\n", $html);
        $html = preg_replace('/<[uo]l[^>]*>/', "\n", $html);
        $html = preg_replace('/<\/[uo]l>/', "\n", $html);

        // Convert emphasis
        $html = preg_replace('/<strong[^>]*>(.*?)<\/strong>/s', "**$1**", $html);
        $html = preg_replace('/<em[^>]*>(.*?)<\/em>/s', "*$1*", $html);

        // Remove all remaining HTML tags
        $html = strip_tags($html);

        // Clean up whitespace
        $html = html_entity_decode($html, ENT_QUOTES, 'UTF-8');
        $html = preg_replace('/\n{3,}/', "\n\n", $html);
        $html = preg_replace('/[ \t]+/', ' ', $html);

        return trim($html);
    }

    private function optimize_content_with_ai($content, $title)
    {
        try {
            $prompt = $this->build_content_optimization_prompt($content, $title);

            $response = wp_remote_post('https://api.openai.com/v1/chat/completions', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->openai_api_key,
                    'Content-Type' => 'application/json'
                ],
                'body' => json_encode([
                    'model' => 'gpt-4o-mini',
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => 'Du bist ein Experte für technische Dokumentation. Optimiere Confluence-Inhalte für bessere Suchbarkeit in Embedding-Systemen, ohne wichtige Informationen zu verlieren.'
                        ],
                        [
                            'role' => 'user',
                            'content' => $prompt
                        ]
                    ],
                    'max_tokens' => 2000,
                    'temperature' => 0.1
                ]),
                'timeout' => 60
            ]);

            if (is_wp_error($response)) {
                $this->log("AI optimization failed: " . $response->get_error_message());
                return false;
            }

            $result = json_decode(wp_remote_retrieve_body($response), true);

            if (!isset($result['choices'][0]['message']['content'])) {
                $this->log("AI optimization: Invalid response format");
                return false;
            }

            return trim($result['choices'][0]['message']['content']);
        } catch (Exception $e) {
            $this->log("AI optimization error: " . $e->getMessage());
            return false;
        }
    }

    private function build_content_optimization_prompt($content, $title)
    {
        return "TITEL: {$title}

AUFGABE: Optimiere diesen deutschen Confluence-Text für bessere Auffindbarkeit in einem Embedding-basierten Suchsystem.

ANFORDERUNGEN:
- Behalte ALLE wichtigen Informationen und technischen Details
- Entferne redundante Phrasen und Layout-Beschreibungen
- Strukturiere den Text logisch mit klaren Überschriften
- Verwende konsistente Terminologie
- Fasse ähnliche Punkte zusammen
- Entferne überflüssige Höflichkeitsformeln

ORIGINALTEXT:
{$content}

OPTIMIERTER TEXT:";
    }

    private function create_smart_chunks($content)
    {
        // Split by headers first
        $sections = preg_split('/\n\n##\s/', $content);
        $chunks = [];

        foreach ($sections as $i => $section) {
            if ($i > 0) {
                $section = "## " . $section; // Re-add header marker
            }

            if (strlen($section) <= $this->chunk_size) {
                $chunks[] = trim($section);
            } else {
                // Split large sections by sentences
                $sentences = preg_split('/(?<=[.!?])\s+/', $section);
                $current_chunk = '';

                foreach ($sentences as $sentence) {
                    if (strlen($current_chunk . ' ' . $sentence) <= $this->chunk_size) {
                        $current_chunk .= ($current_chunk ? ' ' : '') . $sentence;
                    } else {
                        if ($current_chunk) {
                            $chunks[] = trim($current_chunk);
                        }
                        $current_chunk = $sentence;
                    }
                }

                if ($current_chunk) {
                    $chunks[] = trim($current_chunk);
                }
            }
        }

        // Filter out very short chunks
        return array_filter($chunks, function ($chunk) {
            return strlen(trim($chunk)) >= 50;
        });
    }

    private function start_embedding_phase()
    {
        $chunks = $this->get_stored_chunks();

        if (empty($chunks)) {
            throw new Exception('No content chunks found for embedding generation');
        }

        update_option('cks_status', [
            'phase' => 'embedding',
            'total' => count($chunks),
            'processed' => 0,
            'message' => count($chunks) . ' Text-Chunks gefunden, generiere Embeddings...',
            'last_update' => time(),
            'source' => 'confluence'
        ]);

        $this->log("Starting embedding phase with " . count($chunks) . " chunks");
    }

    private function process_embedding_batch_optimized()
    {
        $execution_start = microtime(true);
        $status = get_option('cks_status');
        $chunks = $this->get_stored_chunks();
        $processed = $status['processed'] ?? 0;

        $this->log("Processing embedding batch starting at index: $processed");

        $batch = array_slice($chunks, $processed, $this->embeddings_per_batch);
        if (empty($batch)) {
            $this->complete_sync();
            return;
        }

        // Process in smaller sub-batches for OpenAI
        $sub_batch_size = 5; // Process 5 embeddings at a time
        $processed_count = 0;
        
        for ($i = 0; $i < count($batch); $i += $sub_batch_size) {
            // Check execution time
            if ((microtime(true) - $execution_start) > ($this->max_execution_time - 90)) {
                $this->log("Time limit approaching. Saving progress.");
                break;
            }
            
            $sub_batch = array_slice($batch, $i, $sub_batch_size);
            $texts = array_column($sub_batch, 'content');
            
            try {
                $embeddings = $this->get_openai_embeddings_with_retry($texts);
                
                if ($embeddings && count($embeddings) === count($texts)) {
                    $points = $this->create_qdrant_points($sub_batch, $embeddings);
                    $this->upsert_to_qdrant($points);
                    
                    $processed_count += count($sub_batch);
                    $this->log("Processed embedding sub-batch: " . count($sub_batch) . " items");
                    
                    // Rate limiting for OpenAI
                    if ($i + $sub_batch_size < count($batch)) {
                        sleep($this->openai_delay);
                    }
                } else {
                    $this->log("Embedding generation failed for sub-batch");
                }
                
            } catch (Exception $e) {
                $this->log("Error in embedding sub-batch: " . $e->getMessage());
            }
        }

        // Update status
        $new_processed = $processed + $processed_count;
        $status['processed'] = $new_processed;
        $status['message'] = "Embedding generation: {$new_processed}/{$status['total']} chunks processed";
        $status['last_update'] = time();
        update_option('cks_status', $status);
        
        $this->log("Embedding batch completed: {$processed_count} chunks processed");
    }

    private function complete_sync()
    {
        $status = get_option('cks_status');
        $source = $status['source'] ?? 'unknown';

        update_option('cks_status', [
            'phase' => 'completed',
            'message' => ucfirst($source) . "-Synchronisation erfolgreich abgeschlossen! {$status['total']} Elemente verarbeitet.",
            'last_update' => time(),
            'completed_at' => date('Y-m-d H:i:s'),
            'total_processed' => $status['total'] ?? 0
        ]);

        // Cleanup temporary data
        $this->clear_stored_data();

        $this->log("Sync completed successfully: {$status['total']} items processed");
    }

    // ============================================================================
    // PDF PROCESSING SYSTEM
    // ============================================================================

    public function upload_pdf()
    {
        if (!wp_verify_nonce($_POST['nonce'], 'cks_nonce')) {
            wp_send_json_error(['message' => 'Security check failed']);
        }

        if (empty($_FILES['pdf_file'])) {
            wp_send_json_error(['message' => 'Keine Datei hochgeladen']);
        }

        $file = $_FILES['pdf_file'];

        // Validate file
        if ($file['error'] !== UPLOAD_ERR_OK) {
            wp_send_json_error(['message' => 'Upload-Fehler: ' . $file['error']]);
        }

        if ($file['type'] !== 'application/pdf') {
            wp_send_json_error(['message' => 'Nur PDF-Dateien sind erlaubt']);
        }

        if ($file['size'] > 50 * 1024 * 1024) { // 50MB
            wp_send_json_error(['message' => 'Datei zu groß (max. 50MB)']);
        }

        try {
            // Create upload directory
            $upload_dir = wp_upload_dir();
            $cks_dir = $upload_dir['basedir'] . '/custom-knowledge/';
            $this->ensure_upload_directory();

            // Generate unique filename
            $filename = sanitize_file_name($file['name']);
            $file_path = $cks_dir . wp_unique_filename($cks_dir, $filename);

            // Move uploaded file
            if (!move_uploaded_file($file['tmp_name'], $file_path)) {
                throw new Exception('Fehler beim Speichern der Datei');
            }

            // Process PDF immediately
            $result = $this->process_single_pdf($file_path, $filename);

            // Delete temporary file
            unlink($file_path);

            wp_send_json_success(['message' => $result]);
        } catch (Exception $e) {
            wp_send_json_error(['message' => 'PDF-Verarbeitung fehlgeschlagen: ' . $e->getMessage()]);
        }
    }

    private function process_single_pdf($file_path, $filename)
    {
        $this->log("Processing PDF: {$filename}");

        // Extract text from PDF
        $text_content = $this->extract_text_from_pdf($file_path);

        if (empty($text_content)) {
            throw new Exception('Kein Text im PDF gefunden oder PDF-Extraktion fehlgeschlagen');
        }

        if (strlen($text_content) < 100) {
            throw new Exception('PDF enthält zu wenig Text (weniger als 100 Zeichen)');
        }

        $this->log("Extracted " . strlen($text_content) . " characters from PDF: {$filename}");

        // Create chunks from PDF content
        $chunks = $this->create_pdf_chunks($text_content, $filename);

        if (empty($chunks)) {
            throw new Exception('Keine verwertbaren Text-Chunks aus PDF erstellt');
        }

        // Generate embeddings for chunks mit Retry-Logic
        $texts = array_column($chunks, 'content');
        $embeddings = $this->get_openai_embeddings_with_retry($texts);

        if (!$embeddings || count($embeddings) !== count($texts)) {
            throw new Exception('Embedding-Generierung fehlgeschlagen');
        }

        // Create Qdrant points
        $points = $this->create_qdrant_points($chunks, $embeddings);

        // Store in Qdrant
        $this->upsert_to_qdrant($points);

        $this->log("Successfully processed PDF: {$filename} -> " . count($points) . " chunks stored");

        return "PDF '{$filename}' erfolgreich verarbeitet: " . count($points) . " Text-Chunks erstellt und indexiert";
    }

    private function extract_text_from_pdf($file_path)
    {
        // Try multiple methods for PDF text extraction

        // Method 1: Try pdftotext if available
        if (function_exists('shell_exec') && !empty(shell_exec('which pdftotext'))) {
            $output = shell_exec("pdftotext '" . escapeshellarg($file_path) . "' -");
            if (!empty($output)) {
                return $output;
            }
        }

        // Method 2: Try PHP PDF parser libraries if available
        if (class_exists('Smalot\\PdfParser\\Parser')) {
            try {
                $parser = new \Smalot\PdfParser\Parser();
                $pdf = $parser->parseFile($file_path);
                $text = $pdf->getText();
                if (!empty($text)) {
                    return $text;
                }
            } catch (Exception $e) {
                $this->log("PDF parser failed: " . $e->getMessage());
            }
        }

        // Method 3: Basic PDF text extraction using regex (limited)
        $content = file_get_contents($file_path);
        if ($content === false) {
            throw new Exception('Could not read PDF file');
        }

        // Very basic text extraction - not perfect but better than nothing
        if (preg_match_all('/\(([^)]+)\)/s', $content, $matches)) {
            $text = implode(' ', $matches[1]);
            $text = preg_replace('/[^\w\s\.\,\!\?\-]+/u', ' ', $text);
            $text = preg_replace('/\s+/', ' ', $text);
            return trim($text);
        }

        throw new Exception('PDF text extraction failed - no method available');
    }

    private function create_pdf_chunks($text, $filename)
    {
        // Clean and prepare text
        $text = preg_replace('/\s+/', ' ', $text);
        $text = trim($text);

        // Split into chunks
        $chunks = [];
        $sentences = preg_split('/(?<=[.!?])\s+/', $text);
        $current_chunk = '';
        $chunk_number = 1;

        foreach ($sentences as $sentence) {
            if (strlen($current_chunk . ' ' . $sentence) <= $this->chunk_size) {
                $current_chunk .= ($current_chunk ? ' ' : '') . $sentence;
            } else {
                if ($current_chunk) {
                    $chunks[] = [
                        'content' => trim($current_chunk),
                        'metadata' => [
                            'source' => 'pdf',
                            'filename' => $filename,
                            'title' => pathinfo($filename, PATHINFO_FILENAME),
                            'chunk_index' => $chunk_number,
                            'created_at' => date('Y-m-d H:i:s'),
                            'file_size' => strlen($text)
                        ]
                    ];
                    $chunk_number++;
                }
                $current_chunk = $sentence;
            }
        }

        if ($current_chunk) {
            $chunks[] = [
                'content' => trim($current_chunk),
                'metadata' => [
                    'source' => 'pdf',
                    'filename' => $filename,
                    'title' => pathinfo($filename, PATHINFO_FILENAME),
                    'chunk_index' => $chunk_number,
                    'created_at' => date('Y-m-d H:i:s'),
                    'file_size' => strlen($text)
                ]
            ];
        }

        // Update chunk metadata with total count
        foreach ($chunks as &$chunk) {
            $chunk['metadata']['total_chunks'] = count($chunks);
        }

        return array_filter($chunks, function ($chunk) {
            return strlen(trim($chunk['content'])) >= 50;
        });
    }

    public function process_pdf_batch()
    {
        // Placeholder für PDF-Batch-Verarbeitung
        $this->log("PDF batch processing not implemented yet");
    }

    // ============================================================================
    // OPTIMIERTE OPENAI & QDRANT INTEGRATION
    // ============================================================================

    private function get_single_embedding($text)
    {
        $result = $this->get_openai_embeddings_with_retry([$text]);
        return $result ? $result[0] : false;
    }

    private function get_openai_embeddings_with_retry($texts)
    {
        if (empty($texts)) {
            return [];
        }

        $attempts = 0;
        
        while ($attempts < $this->max_retries) {
            try {
                $this->log("Generating embeddings for " . count($texts) . " texts (attempt " . ($attempts + 1) . ")");

                $response = wp_remote_post('https://api.openai.com/v1/embeddings', [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->openai_api_key,
                        'Content-Type' => 'application/json'
                    ],
                    'body' => json_encode([
                        'input' => $texts,
                        'model' => $this->embedding_model,
                        'encoding_format' => 'float'
                    ]),
                    'timeout' => $this->openai_timeout
                ]);

                if (!is_wp_error($response)) {
                    $response_code = wp_remote_retrieve_response_code($response);
                    
                    if ($response_code === 200) {
                        $result = json_decode(wp_remote_retrieve_body($response), true);
                        if (isset($result['data'])) {
                            $embeddings = array_column($result['data'], 'embedding');
                            $this->log("Generated " . count($embeddings) . " embeddings successfully");
                            return $embeddings;
                        }
                    }
                    
                    if ($response_code === 429) {
                        $wait_time = pow(2, $attempts) * 10;
                        $this->log("OpenAI rate limited. Waiting {$wait_time} seconds...");
                        sleep($wait_time);
                        $attempts++;
                        continue;
                    }
                    
                    $this->log("OpenAI API returned status {$response_code}");
                } else {
                    $this->log("OpenAI API error: " . $response->get_error_message());
                }
                
                $attempts++;
                
                if ($attempts < $this->max_retries) {
                    $sleep_time = pow(2, $attempts) * 5;
                    $this->log("Retrying in {$sleep_time} seconds...");
                    sleep($sleep_time);
                }
                
            } catch (Exception $e) {
                $attempts++;
                $this->log("OpenAI embedding error attempt {$attempts}: " . $e->getMessage());
                if ($attempts < $this->max_retries) {
                    sleep(pow(2, $attempts) * 5);
                }
            }
        }
        
        $this->log("OpenAI embeddings failed after {$this->max_retries} attempts");
        return false;
    }

    private function create_qdrant_points($batch, $embeddings)
    {
        $points = [];
        foreach ($batch as $index => $chunk) {
            if (isset($embeddings[$index])) {
                $points[] = [
                    'id' => wp_generate_uuid4(),
                    'vector' => $embeddings[$index],
                    'payload' => array_merge($chunk['metadata'], [
                        'content' => $chunk['content']
                    ])
                ];
            }
        }
        return $points;
    }

    private function upsert_to_qdrant($points)
    {
        if (empty($points)) {
            return;
        }

        $this->log("Storing " . count($points) . " points in Qdrant collection: {$this->custom_collection}");

        $response = wp_remote_request($this->qdrant_url . '/collections/' . $this->custom_collection . '/points', [
            'method' => 'PUT',
            'headers' => array_merge(
                ['Content-Type' => 'application/json'],
                $this->qdrant_api_key ? ['api-key' => $this->qdrant_api_key] : []
            ),
            'body' => json_encode(['points' => $points]),
            'timeout' => $this->qdrant_timeout
        ]);

        if (is_wp_error($response)) {
            throw new Exception('Qdrant upsert error: ' . $response->get_error_message());
        }

        $response_code = wp_remote_retrieve_response_code($response);
        if ($response_code !== 200) {
            $body = wp_remote_retrieve_body($response);
            throw new Exception("Qdrant upsert failed with status {$response_code}: {$body}");
        }

        $this->log("Successfully stored " . count($points) . " points in Qdrant");
    }

    // ============================================================================
    // OPTIMIERTE STORAGE METHODS - Transients statt Options
    // ============================================================================

    private function get_stored_pages()
    {
        if ($this->use_transients) {
            return get_transient('cks_all_pages') ?: [];
        }
        return get_option('cks_all_pages', []);
    }

    private function store_pages($pages)
    {
        if ($this->use_transients) {
            set_transient('cks_all_pages', $pages, DAY_IN_SECONDS);
        } else {
            update_option('cks_all_pages', $pages);
        }
    }

    private function get_stored_chunks()
    {
        if ($this->use_transients) {
            return get_transient('cks_chunks') ?: [];
        }
        return get_option('cks_chunks', []);
    }

    private function store_chunks($chunks)
    {
        // Memory-friendly chunk storage
        if (count($chunks) > $this->chunk_memory_limit) {
            $this->log("Chunk memory limit reached. Consider processing in smaller batches.");
        }
        
        if ($this->use_transients) {
            set_transient('cks_chunks', $chunks, DAY_IN_SECONDS);
        } else {
            update_option('cks_chunks', $chunks);
        }
    }

    private function clear_stored_data()
    {
        if ($this->use_transients) {
            delete_transient('cks_all_pages');
            delete_transient('cks_chunks');
        } else {
            delete_option('cks_all_pages');
            delete_option('cks_chunks');
        }
    }

    // ============================================================================
    // ADMIN AJAX HANDLERS
    // ============================================================================

    public function test_search()
    {
        if (!wp_verify_nonce($_POST['nonce'], 'cks_nonce')) {
            wp_die('Security check failed');
        }

        $query = sanitize_text_field($_POST['query']);

        if (empty($query)) {
            wp_die('<div style="color: red;">Bitte gib einen Suchbegriff ein</div>');
        }

        try {
            $results = $this->search_custom_knowledge($query, 8);

            if (empty($results)) {
                wp_die('<div style="color: orange; text-align: center; padding: 20px;">📭 Keine Ergebnisse für "' . esc_html($query) . '" gefunden</div>');
            }

            echo '<div style="color: green; margin-bottom: 15px; font-weight: bold;">🔍 ' . count($results) . ' Ergebnisse für "' . esc_html($query) . '":</div>';

            foreach ($results as $result) {
                $score = round($result['score'] * 100, 1);
                $payload = $result['payload'];

                echo '<div style="border: 1px solid #ddd; padding: 12px; margin: 8px 0; border-radius: 5px; background: #fafafa;">';

                // Header with source info
                $source_type = $payload['source'] ?? 'unknown';
                $title = $payload['title'] ?? 'Untitled';

                echo '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">';
                echo '<strong style="color: #333;">' . esc_html($title) . '</strong>';
                echo '<span style="background: #0073aa; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px;">' . $score . '%</span>';
                echo '</div>';

                // Source details
                if ($source_type === 'confluence') {
                    $space = $payload['space_key'] ?? '';
                    echo '<div style="font-size: 12px; color: #666; margin-bottom: 8px;">📄 Confluence: ' . esc_html($space) . '</div>';
                } elseif ($source_type === 'pdf') {
                    $filename = $payload['filename'] ?? 'PDF';
                    echo '<div style="font-size: 12px; color: #666; margin-bottom: 8px;">📋 PDF: ' . esc_html($filename) . '</div>';
                }

                // Content preview
                $content = $payload['content'] ?? '';
                $preview = strlen($content) > 300 ? substr($content, 0, 300) . '...' : $content;
                echo '<div style="font-size: 13px; line-height: 1.4; color: #444;">' . nl2br(esc_html($preview)) . '</div>';

                // URL if available
                if (isset($payload['url'])) {
                    echo '<div style="margin-top: 8px;">';
                    echo '<a href="' . esc_url($payload['url']) . '" target="_blank" style="font-size: 12px; color: #0073aa;">🔗 Zur Quelle</a>';
                    echo '</div>';
                }

                echo '</div>';
            }
        } catch (Exception $e) {
            wp_die('<div style="color: red;">Fehler bei der Suche: ' . esc_html($e->getMessage()) . '</div>');
        }

        wp_die();
    }

    public function debug_info()
    {
        if (!wp_verify_nonce($_POST['nonce'], 'cks_nonce')) {
            wp_die('Security check failed');
        }

        $test_connections = isset($_POST['test_connections']);

        $info = [];

        $info[] = "=== CUSTOM KNOWLEDGE SYSTEM DEBUG INFO (OPTIMIZED) ===";
        $info[] = "Timestamp: " . date('Y-m-d H:i:s');
        $info[] = "";

        // System info
        $info[] = "=== OPTIMIZED SYSTEM CONFIGURATION ===";
        $info[] = "AI Engine Collection: " . $this->ai_engine_collection;
        $info[] = "Custom Collection: " . $this->custom_collection;
        $info[] = "Qdrant URL: " . $this->qdrant_url;
        $info[] = "OpenAI Model: " . $this->embedding_model;
        $info[] = "Embedding Dimensions: " . $this->embedding_dimensions;
        $info[] = "Search Limit: " . $this->search_limit;
        $info[] = "Score Threshold: " . $this->score_threshold;
        $info[] = "";

        // Performance Metriken
        $info[] = "=== PERFORMANCE METRICS ===";
        $info[] = "Pages per batch: " . $this->pages_per_batch . " (optimiert von 25)";
        $info[] = "Embeddings per batch: " . $this->embeddings_per_batch . " (optimiert von 50)";  
        $info[] = "Confluence API batch: " . $this->confluence_api_batch;
        $info[] = "Confluence delay: " . $this->confluence_delay . "s";
        $info[] = "OpenAI delay: " . $this->openai_delay . "s";
        $info[] = "Max retries: " . $this->max_retries;
        $info[] = "Max execution time: " . $this->max_execution_time . "s";
        $info[] = "Using transients: " . ($this->use_transients ? 'Yes' : 'No');
        $info[] = "Chunk memory limit: " . $this->chunk_memory_limit;
        $info[] = "";

        // Collections status
        $info[] = "=== COLLECTIONS STATUS ===";

        $ai_info = $this->get_collection_info($this->ai_engine_collection);
        if ($ai_info) {
            $info[] = "AI Engine Collection:";
            $info[] = "  - Points: " . number_format($ai_info['points_count']);
            $info[] = "  - Status: " . $ai_info['status'];
            $info[] = "  - Vector Size: " . $ai_info['config']['params']['vectors']['size'];
        } else {
            $info[] = "AI Engine Collection: Not found or error";
        }

        $custom_info = $this->get_collection_info($this->custom_collection);
        if ($custom_info) {
            $info[] = "Custom Collection:";
            $info[] = "  - Points: " . number_format($custom_info['points_count']);
            $info[] = "  - Status: " . $custom_info['status'];
            $info[] = "  - Vector Size: " . $custom_info['config']['params']['vectors']['size'];
        } else {
            $info[] = "Custom Collection: Not found or error";
        }

        $info[] = "";

        // System health
        $info[] = "=== SYSTEM HEALTH ===";
        $health = $this->check_system_health();
        foreach ($health as $check => $status) {
            $icon = $status ? "✓" : "✗";
            $info[] = "{$icon} {$check}";
        }
        $info[] = "";

        // Connection tests if requested
        if ($test_connections) {
            $info[] = "=== CONNECTION TESTS ===";

            // Test Qdrant
            $qdrant_test = wp_remote_get($this->qdrant_url . '/collections', [
                'headers' => $this->qdrant_api_key ? ['api-key' => $this->qdrant_api_key] : [],
                'timeout' => 10
            ]);

            if (is_wp_error($qdrant_test)) {
                $info[] = "✗ Qdrant: " . $qdrant_test->get_error_message();
            } else {
                $code = wp_remote_retrieve_response_code($qdrant_test);
                $info[] = $code === 200 ? "✓ Qdrant: Connected (HTTP {$code})" : "✗ Qdrant: HTTP {$code}";
            }

            // Test OpenAI
            if (!empty($this->openai_api_key)) {
                $openai_test = wp_remote_post('https://api.openai.com/v1/embeddings', [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->openai_api_key,
                        'Content-Type' => 'application/json'
                    ],
                    'body' => json_encode([
                        'input' => 'test',
                        'model' => 'text-embedding-3-small'
                    ]),
                    'timeout' => 15
                ]);

                if (is_wp_error($openai_test)) {
                    $info[] = "✗ OpenAI: " . $openai_test->get_error_message();
                } else {
                    $code = wp_remote_retrieve_response_code($openai_test);
                    $info[] = $code === 200 ? "✓ OpenAI: Connected (HTTP {$code})" : "✗ OpenAI: HTTP {$code}";
                }
            } else {
                $info[] = "✗ OpenAI: API Key not configured";
            }

            // Test Confluence
            if (!empty($this->atlassian_base_url)) {
                $confluence_test = wp_remote_get($this->atlassian_base_url . '/rest/api/space?limit=1', [
                    'headers' => [
                        'Accept' => 'application/json'
                    ],
                    'timeout' => 15
                ]);

                if (is_wp_error($confluence_test)) {
                    $info[] = "✗ Confluence: " . $confluence_test->get_error_message();
                } else {
                    $code = wp_remote_retrieve_response_code($confluence_test);
                    $info[] = $code === 200 ? "✓ Confluence: Connected (HTTP {$code})" : "✗ Confluence: HTTP {$code}";
                }
            } else {
                $info[] = "✗ Confluence: Credentials not configured";
            }

            $info[] = "";
        }

        // WordPress options
        $info[] = "=== WORDPRESS OPTIONS ===";
        $info[] = "Initialized: " . get_option('cks_initialized', 'No');
        if ($this->use_transients) {
            $info[] = "All Pages Data (transient): " . (get_transient('cks_all_pages') ? 'Present' : 'None');
            $info[] = "Chunks Data (transient): " . (get_transient('cks_chunks') ? 'Present' : 'None');
        } else {
            $info[] = "All Pages Data (option): " . (get_option('cks_all_pages') ? 'Present' : 'None');
            $info[] = "Chunks Data (option): " . (get_option('cks_chunks') ? 'Present' : 'None');
        }
        $info[] = "";

        // Recent activity
        $status = get_option('cks_status', ['phase' => 'idle']);
        $info[] = "=== CURRENT STATUS ===";
        $info[] = "Phase: " . ($status['phase'] ?? 'unknown');
        $info[] = "Source: " . ($status['source'] ?? 'unknown');
        $info[] = "Message: " . ($status['message'] ?? 'none');
        if (isset($status['processed'], $status['total'])) {
            $info[] = "Progress: {$status['processed']}/{$status['total']}";
        }
        $info[] = "Last Update: " . date('Y-m-d H:i:s', $status['last_update'] ?? 0);
        $info[] = "";

        // Recent logs
        $log = get_option('cks_debug_log', []);
        $info[] = "=== RECENT LOG ENTRIES (Last 10) ===";
        if (!empty($log)) {
            $recent_logs = array_slice($log, -10);
            foreach ($recent_logs as $entry) {
                $info[] = $entry;
            }
        } else {
            $info[] = "No log entries found";
        }

        wp_die('<pre style="background: #f4f4f4; padding: 15px; border-radius: 5px; max-height: 600px; overflow-y: auto;">' . implode("\n", $info) . '</pre>');
    }

    private function check_system_health()
    {
        return [
            'OpenAI API Key configured' => !empty($this->openai_api_key),
            'Qdrant URL configured' => !empty($this->qdrant_url),
            'Confluence configured' => !empty($this->atlassian_base_url),
            'Upload directory writable' => is_writable(wp_upload_dir()['basedir']),
            'Collections initialized' => get_option('cks_initialized') === '1',
            'cURL available' => function_exists('curl_init'),
            'JSON support' => function_exists('json_encode')
        ];
    }

    private function get_collection_info($collection_name)
    {
        $response = wp_remote_get($this->qdrant_url . '/collections/' . $collection_name, [
            'headers' => array_merge(
                ['Content-Type' => 'application/json'],
                $this->qdrant_api_key ? ['api-key' => $this->qdrant_api_key] : []
            ),
            'timeout' => 10
        ]);

        if (is_wp_error($response)) {
            return false;
        }

        $response_code = wp_remote_retrieve_response_code($response);
        if ($response_code !== 200) {
            return false;
        }

        $data = json_decode(wp_remote_retrieve_body($response), true);
        return $data['result'] ?? false;
    }

    public function get_status()
    {
        if (!wp_verify_nonce($_POST['nonce'], 'cks_nonce')) {
            wp_send_json_error(['message' => 'Security check failed']);
        }

        $status = get_option('cks_status', ['phase' => 'idle']);
        wp_send_json_success($status);
    }

    public function reset_sync()
    {
        if (!wp_verify_nonce($_POST['nonce'], 'cks_nonce')) {
            wp_send_json_error(['message' => 'Security check failed']);
        }

        $clear_log = isset($_POST['clear_log']);

        // Reset status and temporary data
        delete_option('cks_status');
        $this->clear_stored_data();

        if ($clear_log) {
            delete_option('cks_debug_log');
            $this->log("System reset: log cleared by user");
        } else {
            $this->log("System reset: status and temporary data cleared");
        }

        wp_send_json_success(['message' => 'System zurückgesetzt']);
    }

    public function delete_document()
    {
        if (!wp_verify_nonce($_POST['nonce'], 'cks_nonce')) {
            wp_send_json_error(['message' => 'Security check failed']);
        }

        $doc_id = sanitize_text_field($_POST['doc_id'] ?? '');
        
        if (empty($doc_id)) {
            wp_send_json_error(['message' => 'Document ID required']);
        }

        try {
            // Mark document as deleted in Qdrant
            $response = wp_remote_request($this->qdrant_url . '/collections/' . $this->custom_collection . '/points/' . $doc_id, [
                'method' => 'PATCH',
                'headers' => array_merge(
                    ['Content-Type' => 'application/json'],
                    $this->qdrant_api_key ? ['api-key' => $this->qdrant_api_key] : []
                ),
                'body' => json_encode([
                    'payload' => ['status' => 'deleted']
                ]),
                'timeout' => 30
            ]);

            if (is_wp_error($response)) {
                throw new Exception('Qdrant delete error: ' . $response->get_error_message());
            }

            $response_code = wp_remote_retrieve_response_code($response);
            if ($response_code !== 200) {
                throw new Exception("Delete failed with status {$response_code}");
            }

            $this->log("Document {$doc_id} marked as deleted");
            wp_send_json_success(['message' => 'Document deleted successfully']);

        } catch (Exception $e) {
            $this->log("Delete document error: " . $e->getMessage());
            wp_send_json_error(['message' => $e->getMessage()]);
        }
    }

    public function reindex_document()
    {
        if (!wp_verify_nonce($_POST['nonce'], 'cks_nonce')) {
            wp_send_json_error(['message' => 'Security check failed']);
        }

        wp_send_json_error(['message' => 'Reindex functionality not implemented yet']);
    }

    public function handle_file_upload()
    {
        // Handle any additional file upload logic if needed
        // This is called on wp_loaded to ensure proper WordPress environment
    }

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    private function log($message)
    {
        $timestamp = date('H:i:s');
        $log_entry = "[$timestamp] CKS: $message";

        // WordPress debug log
        if (WP_DEBUG_LOG) {
            error_log($log_entry);
        }

        // Store in WordPress option (last 100 entries)
        $log = get_option('cks_debug_log', []);
        $log[] = $log_entry;
        $log = array_slice($log, -100); // Keep last 100 entries
        update_option('cks_debug_log', $log, false);
    }
}

// Initialize the system
new Custom_Knowledge_System();

?>