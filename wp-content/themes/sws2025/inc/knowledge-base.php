<?php

/**
 * WordPress Knowledge Base mit OpenAI Embeddings - Verbesserte Version
 * 
 * Installation: Diese Datei in functions.php includen:
 * require_once get_template_directory() . '/knowledge-base.php';
 * 
 * Oder OpenAI API Key direkt hier eintragen (Zeile 20)
 */

// Verhindere direkten Zugriff
if (!defined('ABSPATH')) {
    exit;
}

class WP_Knowledge_Base
{

    private $table_name;
    private $openai_api_key;
    private $options;

    public function __construct(array $options = [])
    {
        $this->options = array_merge(
            [
                "debug" => false
            ],
            $options
        );
        global $wpdb;
        $this->table_name = $wpdb->prefix . 'knowledge_base';

        // HIER DEINEN OPENAI API KEY EINTRAGEN:
        $this->openai_api_key = get_option('kb_openai_key', ''); // Oder direkt: 'sk-dein-key-hier'

        // WordPress Hooks
        add_action('init', [$this, 'init']);
        add_action('admin_menu', [$this, 'admin_menu']);
        add_action('wp_ajax_kb_upload_pdf', [$this, 'handle_pdf_upload']);
        add_action('wp_ajax_kb_crawl_website', [$this, 'crawl_website']);
        add_action('wp_ajax_kb_test_search', [$this, 'test_search']);
        add_action('wp_ajax_kb_test_ai_engine', [$this, 'test_ai_engine_status']);
        add_action('wp_ajax_kb_test_real_ai', [$this, 'test_real_ai_integration']);
        add_action('wp_ajax_kb_create_table', [$this, 'ajax_create_table']);

        // Auto-Update Hooks für Posts/Pages
        add_action('save_post', [$this, 'auto_update_post'], 10, 3);
        add_action('delete_post', [$this, 'auto_delete_post']);
        add_action('wp_trash_post', [$this, 'auto_delete_post']);

        // AI Engine Pro Hook
        add_filter('mwai_ai_query', [$this, 'enhance_ai_query'], 5, 1);

        // Plugin Activation
        register_activation_hook(__FILE__, [$this, 'create_table']);
    }

    public function init()
    {
        // Tabelle bei erstem Load erstellen oder wenn sie nicht existiert
        if (get_option('kb_table_created') !== '2' || !$this->table_exists()) {
            $this->create_table();
        }
    }

    private function table_exists()
    {
        global $wpdb;
        $table_name = $wpdb->prefix . 'knowledge_base';
        $query = $wpdb->prepare("SHOW TABLES LIKE %s", $table_name);
        return $wpdb->get_var($query) == $table_name;
    }

    public function create_table()
    {
        global $wpdb;

        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE IF NOT EXISTS {$this->table_name} (
            id int(11) NOT NULL AUTO_INCREMENT,
            content longtext NOT NULL,
            embedding longtext NOT NULL,
            source varchar(255) DEFAULT '',
            content_type varchar(50) DEFAULT '',
            content_id int(11) DEFAULT NULL,
            created_at timestamp DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        $result = dbDelta($sql);

        // Fallback: Direkte SQL-Ausführung wenn dbDelta nicht funktioniert
        if (!$this->table_exists()) {
            $wpdb->query($sql);
        }

        // Verification
        if ($this->table_exists()) {
            update_option('kb_table_created', '2');
            if ($this->options["debug"]) {
                error_log("Knowledge Base: Table created successfully");
            }
        } else {
            if ($this->options["debug"]) {
                error_log("Knowledge Base: Failed to create table");
                error_log("SQL: " . $sql);
                error_log("dbDelta result: " . print_r($result, true));
                error_log("MySQL Error: " . $wpdb->last_error);
            }
        }
    }

    public function admin_menu()
    {
        add_options_page(
            'Knowledge Base',
            'Knowledge Base',
            'manage_options',
            'knowledge-base',
            [$this, 'admin_page']
        );
    }

    public function admin_page()
    {
        if ($_POST['save_settings']) {
            update_option('kb_openai_key', sanitize_text_field($_POST['openai_key']));
            $this->openai_api_key = $_POST['openai_key'];
            echo '<div class="notice notice-success"><p>Einstellungen gespeichert!</p></div>';
        }

        if ($_POST['reset_table']) {
            delete_option('kb_table_created');
            $this->create_table();
            echo '<div class="notice notice-success"><p>Tabelle wurde neu erstellt!</p></div>';
        }

        global $wpdb;
        $table_exists = $this->table_exists();
        $count = $table_exists ? $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name}") : 0;
        $count_pages = $table_exists ? $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name} WHERE content_type IN ('page', 'post')") : 0;
        $count_pdfs = $table_exists ? $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name} WHERE content_type = 'pdf'") : 0;
?>

        <div class="wrap">
            <h1>Knowledge Base Management</h1>

            <div style="background: #fff; padding: 20px; margin: 20px 0; border-left: 4px solid #0073aa;">
                <h3>Status</h3>
                <p><strong>Datenbank Tabelle:</strong> <?php echo $table_exists ? '✅ Existiert' : '❌ Fehlt'; ?></p>
                <p><strong>Gespeicherte Inhalte:</strong> <?php echo $count; ?> Chunks</p>
                <p><strong>└─ Pages/Posts:</strong> <?php echo $count_pages; ?> Chunks</p>
                <p><strong>└─ PDFs:</strong> <?php echo $count_pdfs; ?> Chunks</p>
                <p><strong>OpenAI Key:</strong> <?php echo $this->openai_api_key ? '✅ Konfiguriert' : '❌ Fehlt'; ?></p>
                <p><strong>Auto-Update:</strong> ✅ Aktiv (Posts/Pages werden automatisch aktualisiert)</p>

                <?php if (!$table_exists): ?>
                    <div style="background: #ffebe8; border: 1px solid #cc0000; padding: 10px; margin: 10px 0;">
                        <strong>⚠️ Tabelle fehlt!</strong> Die Knowledge Base Tabelle existiert nicht.
                        <div style="margin-top: 10px;">
                            <button id="create-table-btn" class="button-secondary">Tabelle neu erstellen</button>
                            <div id="create-table-status"></div>
                        </div>
                    </div>
                <?php endif; ?>
            </div>

            <!-- API Key Settings -->
            <div style="background: #fff; padding: 20px; margin: 20px 0;">
                <h3>OpenAI Einstellungen</h3>
                <form method="post">
                    <table class="form-table">
                        <tr>
                            <th>OpenAI API Key</th>
                            <td>
                                <input type="password" name="openai_key" value="<?php echo esc_attr($this->openai_api_key); ?>"
                                    style="width: 400px;" placeholder="sk-...">
                                <p class="description">Deinen OpenAI API Key von <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com</a></p>
                            </td>
                        </tr>
                    </table>
                    <input type="submit" name="save_settings" class="button-primary" value="Speichern">
                </form>
            </div>

            <!-- PDF Upload -->
            <div style="background: #fff; padding: 20px; margin: 20px 0;">
                <h3>PDF Upload</h3>
                <form id="pdf-upload-form" enctype="multipart/form-data">
                    <input type="file" name="pdf_file" accept=".pdf" required>
                    <button type="submit" class="button-primary">PDF verarbeiten</button>
                    <div id="pdf-status"></div>
                </form>
            </div>

            <!-- Website Crawling -->
            <div style="background: #fff; padding: 20px; margin: 20px 0;">
                <h3>Website Content</h3>
                <button id="crawl-btn" class="button-secondary">Alle Seiten/Posts neu indexieren</button>
                <div id="crawl-status"></div>
                <p class="description">
                    Indexiert alle WordPress Seiten und Posts für die Knowledge Base.<br>
                    <strong>Hinweis:</strong> Bestehende Page/Post-Inhalte werden dabei überschrieben.
                </p>
            </div>

            <!-- Test Search -->
            <div style="background: #fff; padding: 20px; margin: 20px 0;">
                <h3>Knowledge Base testen</h3>
                <input type="text" id="test-query" placeholder="Testfrage eingeben..." style="width: 300px;">
                <button id="test-btn" class="button">Suchen</button>
                <div id="test-results" style="margin-top: 10px;"></div>
            </div>
        </div>

        <script>
            jQuery(document).ready(function($) {
                // Create Table
                $('#create-table-btn').on('click', function() {
                    if (!confirm('Tabelle wirklich neu erstellen?')) return;

                    $('#create-table-status').html('⏳ Tabelle wird erstellt...');

                    $.post(ajaxurl, {
                        action: 'kb_create_table',
                        nonce: '<?php echo wp_create_nonce('kb_nonce'); ?>'
                    }, function(response) {
                        $('#create-table-status').html(response);
                        if (response.includes('✅')) {
                            setTimeout(() => location.reload(), 2000);
                        }
                    });
                });

                // PDF Upload
                $('#pdf-upload-form').on('submit', function(e) {
                    e.preventDefault();
                    var formData = new FormData(this);
                    formData.append('action', 'kb_upload_pdf');
                    formData.append('nonce', '<?php echo wp_create_nonce('kb_nonce'); ?>');

                    $('#pdf-status').html('⏳ PDF wird verarbeitet...');

                    $.ajax({
                        url: ajaxurl,
                        type: 'POST',
                        data: formData,
                        processData: false,
                        contentType: false,
                        success: function(response) {
                            $('#pdf-status').html(response);
                            location.reload(); // Status update
                        }
                    });
                });

                // Website Crawling
                $('#crawl-btn').on('click', function() {
                    $('#crawl-status').html('⏳ Website wird indexiert...');

                    $.post(ajaxurl, {
                        action: 'kb_crawl_website',
                        nonce: '<?php echo wp_create_nonce('kb_nonce'); ?>'
                    }, function(response) {
                        $('#crawl-status').html(response);
                        location.reload(); // Status update
                    });
                });

                // Test Search
                $('#test-btn').on('click', function() {
                    var query = $('#test-query').val();
                    if (!query) return;

                    $('#test-results').html('⏳ Suche läuft...');

                    $.post(ajaxurl, {
                        action: 'kb_test_search',
                        query: query,
                        nonce: '<?php echo wp_create_nonce('kb_nonce'); ?>'
                    }, function(response) {
                        $('#test-results').html(response);
                    });
                });
            });
        </script>

<?php
    }

    public function get_openai_embedding($text)
    {
        if (!$this->openai_api_key) {
            return false;
        }

        $text = trim($text);
        if (strlen($text) < 10) return false;

        $data = [
            'input' => $text,
            'model' => 'text-embedding-3-small'
        ];

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => [
                    "Authorization: Bearer {$this->openai_api_key}",
                    "Content-Type: application/json"
                ],
                'content' => json_encode($data),
                'timeout' => 30
            ]
        ]);

        $response = @file_get_contents('https://api.openai.com/v1/embeddings', false, $context);

        if ($response === false) {
            error_log('OpenAI API Error: ' . error_get_last()['message']);
            return false;
        }

        $result = json_decode($response, true);

        if (isset($result['error'])) {
            error_log('OpenAI API Error: ' . $result['error']['message']);
            return false;
        }

        return $result['data'][0]['embedding'] ?? false;
    }

    public function store_content($content, $source = 'manual', $content_type = '', $content_id = null)
    {
        global $wpdb;

        // Text bereinigen
        $content = $this->clean_text($content);

        // Text in Chunks aufteilen (500 Zeichen)
        $chunks = str_split($content, 500);
        $stored = 0;

        foreach ($chunks as $chunk) {
            $chunk = trim($chunk);

            // Skip sehr kurze oder leere Chunks
            if (strlen($chunk) < 50) continue;

            $embedding = $this->get_openai_embedding($chunk);

            if ($embedding) {
                $wpdb->insert($this->table_name, [
                    'content' => $chunk,
                    'embedding' => json_encode($embedding),
                    'source' => $source,
                    'content_type' => $content_type,
                    'content_id' => $content_id
                ]);
                $stored++;

                // Rate limiting für OpenAI
                sleep(1);
            }
        }

        return $stored;
    }

    private function clean_text($text)
    {
        // HTML Tags mit Leerzeichen ersetzen
        $text = preg_replace('/<\/?(h[1-6]|p|div|li|br|td|th)[^>]*>/i', ' ', $text);
        $text = preg_replace('/<[^>]+>/', ' ', $text);

        // HTML Entities dekodieren  
        $text = html_entity_decode($text, ENT_QUOTES, 'UTF-8');

        // Spezielle Zeichen normalisieren
        $text = str_replace(['&amp;', '&lt;', '&gt;', '&quot;'], ['&', '<', '>', '"'], $text);

        // Mehrfache Leerzeichen/Zeilenumbrüche durch einzelne Leerzeichen ersetzen
        $text = preg_replace('/\s+/', ' ', $text);

        // Satzzeichen normalisieren (Leerzeichen nach Punkten etc.)
        $text = preg_replace('/([.!?])\s*/', '$1 ', $text);

        return trim($text);
    }

    public function handle_pdf_upload()
    {
        if (!wp_verify_nonce($_POST['nonce'], 'kb_nonce')) {
            wp_die('Security check failed');
        }

        if (!isset($_FILES['pdf_file'])) {
            echo '❌ Keine Datei hochgeladen';
            wp_die();
        }

        $file = $_FILES['pdf_file'];
        $tmp_path = $file['tmp_name'];

        // PDF zu Text mit pdftotext
        $text = shell_exec("pdftotext '$tmp_path' -");

        if (!$text || strlen(trim($text)) < 100) {
            echo '❌ PDF konnte nicht verarbeitet werden oder ist leer';
            wp_die();
        }

        $stored = $this->store_content($text, 'pdf_' . $file['name'], 'pdf');

        echo "✅ PDF verarbeitet! $stored Chunks gespeichert.";
        wp_die();
    }

    public function ajax_create_table()
    {
        if (!wp_verify_nonce($_POST['nonce'], 'kb_nonce')) {
            wp_die('Security check failed');
        }

        delete_option('kb_table_created');
        $this->create_table();

        if ($this->table_exists()) {
            echo '✅ Tabelle erfolgreich erstellt!';
        } else {
            echo '❌ Fehler beim Erstellen der Tabelle. Prüfe die Debug-Logs.';
        }

        wp_die();
    }

    public function crawl_website()
    {
        if (!wp_verify_nonce($_POST['nonce'], 'kb_nonce')) {
            wp_die('Security check failed');
        }

        global $wpdb;

        // Erst alle bestehenden Pages/Posts aus der Knowledge Base löschen
        $deleted = $wpdb->delete($this->table_name, [
            'content_type' => 'page'
        ]);
        $deleted += $wpdb->delete($this->table_name, [
            'content_type' => 'post'
        ]);

        // Alle Seiten holen
        $pages = get_posts([
            'post_type' => ['page', 'post'],
            'numberposts' => -1,
            'post_status' => 'publish'
        ]);

        $total_stored = 0;

        foreach ($pages as $page) {
            $content = $page->post_content;

            // Titel auch mit einbeziehen
            $full_content = $page->post_title . "\n\n" . $content;

            $content = wp_strip_all_tags($full_content);
            $content = preg_replace('/\s+/', ' ', $content);

            if (strlen($content) > 100) {
                $stored = $this->store_content(
                    $content,
                    $page->post_type . '_' . $page->ID,
                    $page->post_type,
                    $page->ID
                );
                $total_stored += $stored;
            }
        }

        echo "✅ Website neu indexiert! $deleted alte Chunks gelöscht, $total_stored neue Chunks aus " . count($pages) . " Seiten gespeichert.";
        wp_die();
    }

    /**
     * Automatisches Update bei Post/Page Änderungen
     */
    public function auto_update_post($post_id, $post, $update)
    {
        // Nur bei Posts und Pages
        if (!in_array($post->post_type, ['post', 'page'])) {
            return;
        }

        // Nur bei veröffentlichten Posts
        if ($post->post_status !== 'publish') {
            // Falls Post unpublished wird, aus KB entfernen
            if ($update) {
                $this->auto_delete_post($post_id);
            }
            return;
        }

        // Skip Autosaves und Revisionen
        if (wp_is_post_autosave($post_id) || wp_is_post_revision($post_id)) {
            return;
        }

        global $wpdb;

        // Alte Chunks für diesen Post löschen
        $wpdb->delete($this->table_name, [
            'content_type' => $post->post_type,
            'content_id' => $post_id
        ]);

        // Neuen Content indexieren
        $content = $post->post_content;
        $full_content = $post->post_title . "\n\n" . $content;
        $clean_content = wp_strip_all_tags($full_content);
        $clean_content = preg_replace('/\s+/', ' ', $clean_content);

        if (strlen($clean_content) > 100) {
            $this->store_content(
                $clean_content,
                $post->post_type . '_' . $post_id,
                $post->post_type,
                $post_id
            );

            if ($this->options["debug"]) {
                error_log("Knowledge Base: Auto-updated {$post->post_type} #{$post_id} '{$post->post_title}'");
            }
        }
    }

    /**
     * Automatisches Löschen bei Post/Page Löschung
     */
    public function auto_delete_post($post_id)
    {
        global $wpdb;

        $deleted = $wpdb->delete($this->table_name, [
            'content_id' => $post_id
        ]);

        if ($this->options["debug"] && $deleted > 0) {
            error_log("Knowledge Base: Auto-deleted $deleted chunks for post/page #{$post_id}");
        }
    }

    public function search_knowledge($query, $limit = 3)
    {
        global $wpdb;

        $query_embedding = $this->get_openai_embedding($query);

        if (!$query_embedding) {
            return [];
        }

        // Alle Embeddings holen
        $results = $wpdb->get_results("SELECT content, embedding, source, content_type FROM {$this->table_name}");

        $scored_results = [];

        foreach ($results as $row) {
            $doc_embedding = json_decode($row->embedding, true);
            if (!$doc_embedding) continue;

            $similarity = $this->cosine_similarity($query_embedding, $doc_embedding);

            $scored_results[] = [
                'content' => $row->content,
                'source' => $row->source,
                'content_type' => $row->content_type,
                'score' => $similarity
            ];
        }

        // Nach Relevanz sortieren
        usort($scored_results, function ($a, $b) {
            return $b['score'] <=> $a['score'];
        });

        return array_slice($scored_results, 0, $limit);
    }

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

    public function test_search()
    {
        if (!wp_verify_nonce($_POST['nonce'], 'kb_nonce')) {
            wp_die('Security check failed');
        }

        $query = sanitize_text_field($_POST['query']);
        $results = $this->search_knowledge($query);

        if (empty($results)) {
            echo '<p>❌ Keine relevanten Inhalte gefunden.</p>';
        } else {
            echo '<h4>📋 Gefundene Inhalte:</h4>';
            foreach ($results as $i => $result) {
                $score = round($result['score'] * 100, 1);
                $type_badge = $result['content_type'] ? "[{$result['content_type']}]" : "";
                echo "<div style='border: 1px solid #ddd; padding: 10px; margin: 5px 0;'>";
                echo "<strong>Relevanz: {$score}%</strong> $type_badge | Quelle: {$result['source']}<br>";
                echo "<em>" . substr($result['content'], 0, 200) . "...</em>";
                echo "</div>";
            }
        }

        wp_die();
    }

    public function test_ai_engine_status()
    {
        if (!wp_verify_nonce($_POST['nonce'], 'kb_nonce')) {
            wp_die('Security check failed');
        }

        echo '<h4>🔍 AI Engine Detection:</h4>';

        // Erweiterte AI Engine Erkennungen
        $checks = [
            'AI Engine Plugin aktiv (Standard)' => (
                is_plugin_active('ai-engine/ai-engine.php') ||
                is_plugin_active('ai-engine-pro/ai-engine.php')
            ),
            'MWAI Plugin Ordner existiert' => (
                is_dir(WP_PLUGIN_DIR . '/ai-engine') ||
                is_dir(WP_PLUGIN_DIR . '/ai-engine-pro')
            ),
            'MWAI_CORE_VERSION constant' => defined('MWAI_CORE_VERSION'),
            'MWAI_CORE_PATH constant' => defined('MWAI_CORE_PATH'),
            'Meow_MWAI_Core class' => class_exists('Meow_MWAI_Core'),
            'MwaiCore class' => class_exists('MwaiCore'),
            'Mwai\Core class' => class_exists('Mwai\Core'),
            'mwai_ai_query function' => function_exists('mwai_ai_query'),
            'mwai_stats_add function' => function_exists('mwai_stats_add'),
            'AI Engine Admin Seite' => (
                function_exists('admin_url') &&
                get_option('active_plugins') &&
                in_array('ai-engine/ai-engine.php', get_option('active_plugins'))
            ),
            'Meow Apps Framework' => class_exists('Meow_MWAI_Admin')
        ];

        $ai_engine_detected = false;
        foreach ($checks as $check => $result) {
            $status = $result ? '✅' : '❌';
            echo "<p><strong>$status $check:</strong> " . ($result ? 'JA' : 'NEIN') . "</p>";
            if ($result) $ai_engine_detected = true;
        }

        // Zusätzliche Plugin-Info wenn gefunden
        if (defined('MWAI_CORE_VERSION')) {
            echo '<p><strong>🎯 AI Engine Version:</strong> ' . MWAI_CORE_VERSION . '</p>';
        }

        if (defined('MWAI_CORE_PATH')) {
            echo '<p><strong>📁 AI Engine Pfad:</strong> ' . MWAI_CORE_PATH . '</p>';
        }

        // Plugin direkt über WordPress API prüfen
        if (!function_exists('get_plugins')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }

        $all_plugins = get_plugins();
        $ai_plugins = [];
        foreach ($all_plugins as $plugin_file => $plugin_data) {
            if (
                stripos($plugin_data['Name'], 'ai engine') !== false ||
                stripos($plugin_file, 'ai-engine') !== false ||
                stripos($plugin_data['Author'], 'meow') !== false && stripos($plugin_data['Name'], 'ai') !== false
            ) {
                $ai_plugins[$plugin_file] = $plugin_data;
            }
        }

        if (!empty($ai_plugins)) {
            echo '<h4>🔍 Gefundene AI Engine Plugins:</h4>';
            foreach ($ai_plugins as $file => $data) {
                $active = is_plugin_active($file) ? '✅ AKTIV' : '❌ INAKTIV';
                echo "<p><strong>$active {$data['Name']}</strong> v{$data['Version']} - $file</p>";
            }
        }

        // Hook Test mit verbesserter Objekterkennung
        echo '<h4>🔗 Hook Test:</h4>';

        // Verschiedene Mock-Objekte testen (AI Engine verwendet verschiedene Strukturen)
        $test_results = [];

        // Test 1: Einfaches stdClass Objekt
        $mock1 = new stdClass();
        $mock1->query = "Test Hook Query 1";
        $original1 = clone $mock1;
        $enhanced1 = $this->enhance_ai_query($mock1);
        $test_results['stdClass mit query'] = ($enhanced1->query !== $original1->query);

        // Test 2: Objekt mit message Property
        $mock2 = new stdClass();
        $mock2->message = "Test Hook Query 2";
        $original2 = clone $mock2;
        $enhanced2 = $this->enhance_ai_query($mock2);
        $test_results['stdClass mit message'] = (isset($enhanced2->message) && $enhanced2->message !== $original2->message);

        // Test 3: Array-ähnliches Objekt
        $mock3 = (object)['prompt' => 'Test Hook Query 3'];
        $original3 = clone $mock3;
        $enhanced3 = $this->enhance_ai_query($mock3);
        $test_results['Object mit prompt'] = (isset($enhanced3->prompt) && $enhanced3->prompt !== $original3->prompt);

        $hook_working = array_filter($test_results);

        if (!empty($hook_working)) {
            echo '<p>✅ <strong>Hook funktioniert!</strong></p>';
            foreach ($test_results as $test => $result) {
                $status = $result ? '✅' : '❌';
                echo "<p>$status $test</p>";
            }
        } else {
            echo '<p>❌ <strong>Hook funktioniert NICHT</strong></p>';
            echo '<p><strong>Mögliche Gründe:</strong></p>';

            global $wpdb;
            $count = $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name}");
            if ($count == 0) {
                echo '<p>• Keine Inhalte in Knowledge Base</p>';
            }
            if (!$this->openai_api_key) {
                echo '<p>• OpenAI API Key fehlt</p>';
            }
            if (!$ai_engine_detected) {
                echo '<p>• AI Engine Plugin nicht richtig erkannt</p>';
            }
        }

        // WordPress Hook Status
        echo '<h4>🎣 WordPress Hook Status:</h4>';
        global $wp_filter;

        $mwai_hooks = [];
        foreach ($wp_filter as $hook_name => $hook_obj) {
            if (strpos($hook_name, 'mwai') !== false) {
                $mwai_hooks[$hook_name] = count($hook_obj->callbacks);
            }
        }

        if (isset($wp_filter['mwai_ai_query'])) {
            echo '<p>✅ <strong>mwai_ai_query Hook registriert</strong></p>';
            $priorities = array_keys($wp_filter['mwai_ai_query']->callbacks);
            echo '<p><strong>Prioritäten:</strong> ' . implode(', ', $priorities) . '</p>';
        } else {
            echo '<p>❌ <strong>mwai_ai_query Hook NICHT registriert</strong></p>';
        }

        if (!empty($mwai_hooks)) {
            echo '<p><strong>Alle MWAI Hooks:</strong></p>';
            foreach ($mwai_hooks as $hook => $callback_count) {
                echo "<p>• $hook ($callback_count callbacks)</p>";
            }
        } else {
            echo '<p>⚠️ <strong>Keine MWAI Hooks gefunden</strong></p>';
        }

        // Knowledge Base Status
        echo '<h4>📚 Knowledge Base Status:</h4>';
        global $wpdb;
        $kb_count = $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name}");
        $api_status = $this->openai_api_key ? '✅ Verfügbar' : '❌ Fehlt';

        echo "<p><strong>Gespeicherte Chunks:</strong> $kb_count</p>";
        echo "<p><strong>OpenAI API Key:</strong> $api_status</p>";

        if ($kb_count > 0 && $this->openai_api_key) {
            echo '<p>✅ <strong>Knowledge Base bereit für Abfragen</strong></p>';
        } else {
            echo '<p>⚠️ <strong>Knowledge Base nicht vollständig konfiguriert</strong></p>';
        }

        // Gesamtstatus
        echo '<h4>🎯 Gesamtstatus:</h4>';
        if ($ai_engine_detected && $kb_count > 0 && $this->openai_api_key) {
            echo '<p style="color: green; font-weight: bold;">✅ Alles bereit! Knowledge Base sollte funktionieren.</p>';
        } else {
            echo '<p style="color: orange; font-weight: bold;">⚠️ Setup unvollständig - prüfe die einzelnen Punkte oben.</p>';
        }

        wp_die();
    }

    // Verbesserte enhance_ai_query Funktion für AI Engine Pro
    public function enhance_ai_query($query_obj)
    {
        if ($this->options["debug"]) error_log("=== enhance_ai_query START ===");
        if ($this->options["debug"]) error_log("Query object type: " . get_class($query_obj));

        // AI Engine Pro Query Objekt hat spezielle Methoden
        $query_text = '';

        // AI Engine Pro v2.9.8 Query Objekt Struktur
        if (method_exists($query_obj, 'get_message')) {
            $query_text = $query_obj->get_message();
            if ($this->options["debug"]) error_log("Found get_message(): " . substr($query_text, 0, 100));
        } elseif (method_exists($query_obj, 'getMessage')) {
            $query_text = $query_obj->getMessage();
            if ($this->options["debug"]) error_log("Found getMessage(): " . substr($query_text, 0, 100));
        } elseif (method_exists($query_obj, 'get_query')) {
            $query_text = $query_obj->get_query();
            if ($this->options["debug"]) error_log("Found get_query(): " . substr($query_text, 0, 100));
        } elseif (property_exists($query_obj, 'message')) {
            $query_text = $query_obj->message;
            if ($this->options["debug"]) error_log("Found property message: " . substr($query_text, 0, 100));
        } elseif (property_exists($query_obj, 'query')) {
            $query_text = $query_obj->query;
            if ($this->options["debug"]) error_log("Found property query: " . substr($query_text, 0, 100));
        } elseif (property_exists($query_obj, 'prompt')) {
            $query_text = $query_obj->prompt;
            if ($this->options["debug"]) error_log("Found property prompt: " . substr($query_text, 0, 100));
        }

        // Debug: Alle verfügbaren Methoden und Properties loggen
        if ($this->options["debug"]) {
            $methods = get_class_methods($query_obj);
            error_log("Available methods: " . implode(', ', $methods ?: []));

            $properties = get_object_vars($query_obj);
            error_log("Available properties: " . implode(', ', array_keys($properties)));
        }

        if (empty($query_text)) {
            if ($this->options["debug"]) error_log("No query text found, returning original object");
            return $query_obj;
        }

        if ($this->options["debug"]) error_log("Searching knowledge for: " . substr($query_text, 0, 100));

        // Knowledge Base durchsuchen
        $knowledge = $this->search_knowledge($query_text, 5);

        if ($this->options["debug"]) error_log("Knowledge results: " . count($knowledge));

        if (!empty($knowledge)) {
            $context = "=== KNOWLEDGE BASE CONTEXT ===\n";

            foreach ($knowledge as $item) {
                $context .= "• " . trim($item['content']) . "\n";
            }

            $context .= "\n=== ORIGINAL QUESTION ===\n";
            $enhanced_query = $context . $query_text;

            if ($this->options["debug"]) error_log("Enhanced query length: " . strlen($enhanced_query));

            // Query zurück ins Objekt setzen - verschiedene Methoden probieren
            if (method_exists($query_obj, 'set_message')) {
                $query_obj->set_message($enhanced_query);
                if ($this->options["debug"]) error_log("Used set_message()");
            } elseif (method_exists($query_obj, 'setMessage')) {
                $query_obj->setMessage($enhanced_query);
                if ($this->options["debug"]) error_log("Used setMessage()");
            } elseif (method_exists($query_obj, 'set_query')) {
                $query_obj->set_query($enhanced_query);
                if ($this->options["debug"]) error_log("Used set_query()");
            } elseif (property_exists($query_obj, 'message')) {
                $query_obj->message = $enhanced_query;
                if ($this->options["debug"]) error_log("Set property message");
            } elseif (property_exists($query_obj, 'query')) {
                $query_obj->query = $enhanced_query;
                if ($this->options["debug"]) error_log("Set property query");
            } elseif (property_exists($query_obj, 'prompt')) {
                $query_obj->prompt = $enhanced_query;
                if ($this->options["debug"]) error_log("Set property prompt");
            }
        } else {
            if ($this->options["debug"]) error_log("No relevant knowledge found");
        }

        if ($this->options["debug"]) error_log("=== enhance_ai_query END ===");
        return $query_obj;
    }

    // Erweiterte Test-Funktion für echte AI Engine Integration
    public function test_real_ai_integration()
    {
        if (!wp_verify_nonce($_POST['nonce'], 'kb_nonce')) {
            wp_die('Security check failed');
        }

        echo '<h4>🔧 Echter AI Engine Test:</h4>';

        // Test ob unser Hook wirklich funktioniert mit AI Engine's natürlichem Workflow
        echo '<p>💡 <strong>Anleitung für Live-Test:</strong></p>';
        echo '<ol>';
        echo '<li>Gehe zu AI Engine Dashboard</li>';
        echo '<li>Öffne einen Chatbot oder stelle eine Frage</li>';
        echo '<li>Frage etwas, was in deiner Knowledge Base stehen könnte</li>';
        echo '<li>Prüfe die Debug-Logs in WordPress</li>';
        echo '</ol>';

        // Debug aktivieren für Live-Test
        $debug_status = $this->options["debug"] ? 'AN' : 'AUS';
        echo "<p><strong>Debug Logging:</strong> $debug_status</p>";

        if (!$this->options["debug"]) {
            echo '<p>⚠️ <strong>Aktiviere Debug in der Knowledge Base Class für detaillierte Logs!</strong></p>';
        }

        // Shortcode Test
        echo '<h4>🧪 Shortcode Test:</h4>';
        echo '<p>Teste den Knowledge Base Hook mit diesem Shortcode:</p>';
        echo '<code>[mwai_chat]</code>';
        echo '<p>Oder erstelle einen Test-Chatbot in AI Engine und frage:</p>';
        echo '<ul>';
        echo '<li>"Was steht in der Knowledge Base über [dein Thema]?"</li>';
        echo '<li>"Erkläre mir [ein Begriff aus deinen PDFs]"</li>';
        echo '</ul>';

        // Log-Datei Info
        $upload_dir = wp_upload_dir();
        echo '<h4>📋 Debug Logs prüfen:</h4>';
        echo '<p>WordPress Debug Logs findest du hier:</p>';
        echo '<ul>';
        echo '<li><code>/wp-content/debug.log</code></li>';
        echo '<li>Oder in den Server Error Logs</li>';
        echo '</ul>';
        echo '<p>Suche nach Einträgen mit <code>enhance_ai_query</code></p>';

        wp_die();
    }
}

// Knowledge Base initialisieren
new WP_Knowledge_Base([
    "debug" => true
]);

?>