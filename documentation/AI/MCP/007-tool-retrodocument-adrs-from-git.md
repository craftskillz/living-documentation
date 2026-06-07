# MCP tool: `retrodocument_adrs_from_git`

## Description

Prepare a retrodocumentation packet from recent git history.

Reads up to `limit` commits (default 100, hard cap 200) from the git repository that contains `sourceRoot`, ordered **oldest first** so the LLM can walk decisions in chronological order. Per commit, returns: sha, committer/author dates (ISO 8601), author name, subject, body, parent count, and `filesChanged` annotated with `changeType` (A/M/D/R/C/T), `underSourceRoot`, `existsNow`, and `godFileSuspect` (lock files, manifests , flagged as poor metadata targets per `add_metadata` guidance).

Each commit carries a `state`:

- `candidate` , has at least one non-deleted, non-god file under `sourceRoot`; worth a semantic look.
- `trivial` , no source-bearing files (docs-only, formatting, config-only); skip unless the LLM has reason.
- `merge` , has more than one parent; skip unless the merge introduces a documented decision.

This is a factual reporting tool, not the whole workflow. Use prompt `retrodocument-adrs-from-git` when the LLM must decide whether each commit deserves a new ADR (Outcome A), should supersede an existing one (Outcome B), or be skipped (Outcome C).

Requires `sourceRoot` to be inside a git working tree; errors out otherwise.

## Schéma d'entrée

```json
{
  "type": "object",
  "properties": {
    "limit": {
      "type": "number",
      "description": "Number of commits to return (default 100, max 200)."
    },
    "since": {
      "type": "string",
      "description": "Optional git --since expression (e.g. `2024-01-01`, `6 months ago`). Passed straight to git log."
    }
  }
}
```

## Requête effectuée

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "retrodocument_adrs_from_git",
    "arguments": {}
  }
}
```

## Résultat

```json
{
  "sourceRoot": "/Users/ymedaghri/Documents/Repositories/Medaghri-Alaoui-Repositories/09_My_Published_Projects/living-documentation",
  "gitRoot": "/Users/ymedaghri/Documents/Repositories/Medaghri-Alaoui-Repositories/09_My_Published_Projects/living-documentation",
  "limit": 100,
  "since": null,
  "totalCommits": 12,
  "stateCounts": {
    "candidate": 7,
    "trivial": 5,
    "merge": 0
  },
  "commits": [
    {
      "sha": "73f68ebf525030978a0e222193fbab847bcea775",
      "shortSha": "73f68ebf",
      "committerDate": "2026-05-11T19:16:02+02:00",
      "authorDate": "2026-05-11T19:16:02+02:00",
      "author": "Medaghri-Alaoui Youssef",
      "subject": "Initial commit Reset the 11 May 2026",
      "body": "",
      "parents": 0,
      "state": "candidate",
      "filesChanged": [
        {
          "path": ".c8rc.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": ".github/dependabot.yml",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": ".github/workflows/e2e.yml",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": ".github/workflows/publish.yml",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": ".gitignore",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": ".vscode/settings.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "AGENTS.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "CLAUDE.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "LICENSE",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "README.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "bin/cli.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/.living-doc.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/.metadata.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_03_20_10_15_[CONFIGURATION]_link_extra_files_as_documentation.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_03_21_10_25_[CONFIGURATION]_general_category_and_sidebar_defaults.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_03_22_11_10_[STYLE]_always_dark_syntax_highlighting.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_03_10_15_[DIAGRAM]_debug_overlay.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_03_10_40_[DIAGRAM]_modularisation_javascript.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_03_11_20_[DIAGRAM]_snap_to_grid.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_03_12_05_[DIAGRAM]_vis_network_z_order_patch.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_05_10_50_[FRONTEND]_word_cloud.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_08_10_30_[FRONTEND]_strip_frontmatter_from_article_rendering.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_08_12_00_[FRONTEND]_new_document_creation_modal_with_folder_browser.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_08_12_20_[FILENAME]_datetime_precision_in_filename_pattern.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_08_13_00_[EDITOR]_markdown_snippet_inserter_with_detection.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_08_13_15_[NAVIGATION]_anchor_scroll_and_folder_sort_convention.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_08_[DIAGRAM]_edge_label_rotation_stamp_overlay_png_group_fix.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_10_[ANNOTATION]_marker_highlight_with_anchor_spans_and_dom_traversal.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_12_[DIAGRAM]_insertion_diagramme_via_snippet_et_sauvegarde_auto_png.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_12_[SIDEBAR]_creation_dossier_icones_font_awesome_et_dossiers_vides_dans_le_drawer.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_13_[DIAGRAM]_node_locking.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_13_[DIAGRAM]_palette_couleurs_admin_et_corrections_editeur.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_13_[DIAGRAM]_port_anchored_edges_free_arrows_and_edge_styling.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_14_[DIAGRAM]_Undo_Redo_History_Snapshot_Based.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_14_[I18N]_internationalization_en_fr_with_json_translation_files.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_14_[MCP]_draft_mcp.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_14_[SNIPPET]_colored_section_and_colored_text_snippets.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_15_[DIAGRAM]_alignment_guides_center_snap_hitbox_fix_and_state_persistence.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_15_[DIAGRAM]_edge_label_editor_position_fix_for_port_edges.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_15_[DIAGRAM]_finer_grid_and_alignment_guides_closest_node_with_tiebreak.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_15_[DIAGRAM]_port_ellipse_database_fix_stamp_bug_and_size_stamp.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_15_[EXPORT]_html_export_with_notion_and_confluence_zip_modes.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_20_[DIAGRAM]_edge_anchor_rehook_on_selection.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_20_[DIAGRAM]_edge_label_resize_box_text_wrap_and_background.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_20_[DIAGRAM]_free_arrow_two_click_anchor_pivot_and_snap_to_connect.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_20_[TUTORIAL]_interroger_le_mcp_server_avec_curl.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_21_[FILES]_file_attachments_paperclip_drag_drop_paste_and_blocked_extensions.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_21_[MODAL_UX]_folder_picker_unification_click_to_select.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_21_[NAVIGATION]_anchor_select_dropdowns_and_navhistory_rewind.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_22_[METADATA]_files_management_popup_with_metadata_search_and_accuracy_formula_fix.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_22_[METADATA]_source_file_bindings_and_accuracy_gauge.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_22_[SIDEBAR]_resizable_drawer_with_persisted_width.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_22_[SNIPPET]_emojis_picker_with_bilingual_tag_search.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_23_[CONFIGURATION]_exclusive_folder_and_category_expansion_options.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_23_[EDITOR]_image_paste_name_live_sanitization_lowercase_ascii_only.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_23_[FRONTEND]_code_block_collapsible_with_configurable_max_height_and_copy_button.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_23_[FRONTEND]_tame_tailwind_typography_defaults_for_inline_images_and_hr.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_23_[RENDERING]_configurable_markdown_newline_handling_commonmark_vs_gfm_breaks.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_24_[CONFIGURATION]_portable_living_doc_json_with_relative_paths.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_24_[TESTING]_e2e_tests_with_playwright_and_unified_coverage_via_c8.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_27_[PACKAGING]_fix_npx_404_via_send_dotfiles_allow.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_05_07_22_05_[MCP]_default_diagram_style_conventions.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_05_07_22_25_[MCP_DIAGRAM]_architectural_kind_render_as_separation.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_05_07_22_45_[MCP_DIAGRAM]_documentary_evidence_provenance.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_05_07_23_05_[MCP]_cross_project_documentation_workspace_confirmation.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_05_07_23_23_[DIAGRAM]_layout_deterministe_des_diagrammes_mcp.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_05_08_20_01_[DIAGRAM]_custom_shape_libraries_and_variable_ports.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_05_08_20_45_[DIAGRAM]_node_double_click_takes_precedence_over_crossing_edges.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_05_08_21_26_[DIAGRAM]_lower_z_targets_can_be_connected_unless_they_are_background_containers.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_05_11_15_40_[MCP]_server_guide_and_feature_workflow_for_the_mcp.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_05_11_15_41_[AI_CONTEXT]_ai_context_page_orientation_instructions_rules_and_mcp_explorer.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_05_11_15_42_[STARTER_DOC]_bilingual_starter_doc_and_interactive_npx_initializer.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_05_11_15_43_[DIAGRAM]_edge_arrow_direction_adds_from_value_alongside_to_both_and_none.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_05_11_15_44_[DIAGRAM]_edge_lock_button_toggles_unlock_in_addition_to_lock.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_05_11_15_44_[DIAGRAM]_font_size_readout_on_the_node_property_bar.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_05_11_16_08_[AI_CONTEXT]_mcp_explorer_saves_run_results_as_markdown_documents_in_ai_mcp_folder.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/2026_01_01_how_to.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/AGENTS.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/CLAUDE.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MEMORY.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/PROJECT-INSTRUCTIONS.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/PROJECT-STACK.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/PROJECT-USEFUL-COMMANDS.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/rules/diagram-vis-network-gotchas.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/rules/i18n-user-visible-strings.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/rules/no-magic-numbers.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/rules/playwright-coverage-through-cli.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/API_Gateway.svg",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/Simple_Storage_Service.svg",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/credit-card-svgrepo-com.svg",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/diagram_js_module_dependencies.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/image_2026_04_04_195343_7uq8.jpg",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/readme-code-blocks-highlighting.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/readme-code-blocks.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/readme-extra-files.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/readme-filename-pattern.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/readme-intelligent-search-demo.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/readme-intelligent-search.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/readme-sidebar.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/tablet-android-svgrepo-com.svg",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/.annotations.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/.diagrams.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/.living-doc.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/.metadata.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/1_tutorial/2026_04_11_13_25_[General]_crer_vos_dossiers.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/1_tutorial/2026_04_11_18_58_[General]_creer_un_document_dans_un_dossier.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/1_tutorial/2026_04_12_09_00_[General]_editer_et_sauvegarder.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/1_tutorial/2026_04_12_10_00_[General]_utiliser_les_snippets.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/2026_04_08_20_52_[General]_welcome.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/2026_04_11_12_55_[General]_premiers_pas.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/2_guide/2026_04_08_00_04_[DOCUMENT]_utilisation_des_images_plein_ecran_lien_clickable.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/2_guide/2026_04_08_23_38_[Configuration]_demarrage_de_living_documentation.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/2_guide/2026_04_09_09_00_[NAVIGATION]_recherche_plein_texte.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/2_guide/2026_04_09_10_00_[EXPORT]_exporter_en_pdf.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/2_guide/2026_04_09_11_00_[Configuration]_configurer_le_panneau_admin.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/2_guide/2026_04_09_12_00_[Configuration]_extra_files.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/2_guide/2026_04_09_13_00_[WORDCLOUD]_word_cloud.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/3_concept/2026_04_08_20_58_[DOCUMENTING]_ADRS.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/3_concept/2026_04_08_22_15_[DOCUMENTING]_living_documentation.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/3_concept/2026_04_08_22_46_[METHODOLOGY]_diataxis_architecture_du_contenu.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/4_reference/2026_04_08_23_14_[FUNDAMENTALS]_the_living_documentation_tool.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/4_reference/2026_04_09_01_00_[REFERENCE]_raccourcis_clavier.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/4_reference/2026_04_09_02_00_[REFERENCE]_tokens_pattern_nommage.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/4_reference/2026_04_09_03_00_[REFERENCE]_types_de_snippets.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/4_reference/2026_04_11_17_31_[FUNDAMENTALS]_architecturer_une_documentation.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/4_reference/2026_04_12_14_07_[FUNDAMENTALS]_dossiers_et_catgories.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/5_talks/2026_04_28_09_48_[CONFERENCE]_demo_living_documentation_mcp_en_conference.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/images/admin_screenshot.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/images/ajout-document.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/images/ajouter-document-categorie.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/images/ajouter_un_document_dans_un_dossier.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/images/architecturer_une_documentation_reference.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/images/cr_er_un_document.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/images/creation-nouveau-dossier.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/images/creer-document-context-engineering.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/images/creer-dossier-only-tutoriel.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/images/creer-dossier-tutoriel.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/images/creer-dossiers-done.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/images/creer-un-document.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/images/creer-vos-dossiers-tutoriel.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/images/creer-vos-dossiers.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/images/decouverte_adrs.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/images/diataxis.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/images/diataxis_callout.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/images/document-cree.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/images/liens_snippets.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/images/living_documentation.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/images/living_documentation_context_demo_conf.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/images/npm_logo.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/images/popup-creer-document.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/images/popup-creer-dossier.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/images/popup-dossier-cree.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/images/quatre-dossiers-crees.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/images/screenshot-living-doc.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/images/the_living_documentation_tool.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "justfile",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "memory/MEMORY.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "mise.toml",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "package-lock.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": true
        },
        {
          "path": "package.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": true
        },
        {
          "path": "playwright.config.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "scripts/copy-assets.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/accuracy-gauge.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/admin.html",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/annotations.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/boot.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/config.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/confirm-modal.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/context.html",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/dark-mode.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/diagram-link-modal.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/diagram.html",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/diagram/alignment.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/diagram/clipboard.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/diagram/constants.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/diagram/custom-shapes.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/diagram/debug.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/diagram/edge-panel.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/diagram/edge-rendering.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/diagram/evidence.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/diagram/grid.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/diagram/groups.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/diagram/history.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/diagram/image-name-modal.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/diagram/image-upload.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/diagram/label-editor.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/diagram/link-panel.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/diagram/main.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/diagram/network.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/diagram/node-panel.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/diagram/node-rendering.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/diagram/persistence.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/diagram/ports.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/diagram/selection-overlay.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/diagram/state.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/diagram/t.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/diagram/toast.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/diagram/unlock-hold.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/diagram/zoom.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/documents.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/export.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/file-attach.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/files-modal.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/i18n.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/i18n/en.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/i18n/fr.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/image-paste.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/index.html",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/local-search.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/metadata.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/misc.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/new-doc-modal.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/new-folder-modal.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/search.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/shape-editor.html",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/sidebar-helpers.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/sidebar-resize.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/sidebar.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/snippet-detect.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/snippet-table.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/snippet-tree.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/snippets.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/state.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/utils.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/vendor/wordcloud2.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/wordcloud.js",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/lib/config.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/lib/hash.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/lib/metadata.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/lib/parser.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/mcp/server.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/mcp/tools/diagrams.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/mcp/tools/documents.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/mcp/tools/metadata.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/mcp/tools/source.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/routes/annotations.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/routes/browse-source.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/routes/browse.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/routes/config.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/routes/context.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/routes/diagrams.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/routes/documents.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/routes/export.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/routes/files.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/routes/images.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/routes/metadata.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/routes/shape-libraries.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/routes/wordcloud.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/server.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "starter-doc-fr/.living-doc.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "starter-doc-fr/ADRS/2026_01_01_[ADR]_example_architecture_decision.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "starter-doc-fr/AI/2026_01_01_how_to.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "starter-doc-fr/AI/PROJECT-INSTRUCTIONS.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "starter-doc-fr/AI/PROJECT-STACK.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "starter-doc-fr/AI/PROJECT-USEFUL-COMMANDS.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "starter-doc-fr/AI/default/AGENTS.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "starter-doc-fr/AI/default/CLAUDE.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "starter-doc-fr/AI/default/MEMORY.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "starter-doc-fr/AI/rules/no-magic-numbers.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "starter-doc/.living-doc.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "starter-doc/ADRS/2026_01_01_[ADR]_example_architecture_decision.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "starter-doc/AI/2026_01_01_how_to.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "starter-doc/AI/PROJECT-INSTRUCTIONS.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "starter-doc/AI/PROJECT-STACK.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "starter-doc/AI/PROJECT-USEFUL-COMMANDS.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "starter-doc/AI/default/AGENTS.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "starter-doc/AI/default/CLAUDE.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "starter-doc/AI/default/MEMORY.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "starter-doc/AI/rules/no-magic-numbers.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/api/annotations.spec.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/api/browse-source.spec.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/api/browse.spec.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/api/cli.spec.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/api/config-validation.spec.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/api/context.spec.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/api/diagrams.spec.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/api/documents.spec.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/api/export.spec.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/api/extra-files.spec.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/api/files.spec.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/api/images.spec.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/api/mcp.spec.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/api/metadata.spec.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/api/parser-branches.spec.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/api/shape-libraries.spec.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/api/wordcloud.spec.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/e2e/config.spec.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/e2e/context.spec.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/e2e/editor.spec.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/e2e/metadata.spec.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/e2e/viewer.spec.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/fixtures/legacy-abs-paths/testdocs/.living-doc.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/fixtures/legacy-abs-paths/testdocs/2026_01_01_10_00_[General]_intro.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/fixtures/minimal/testdocs/.living-doc.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/fixtures/minimal/testdocs/2026_01_01_10_00_[General]_intro.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/fixtures/minimal/testdocs/2026_01_02_10_00_[Guide]_quickstart.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/fixtures/minimal/testdocs/2026_01_03_10_00_[Guide]_advanced.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/fixtures/parser-cat-only-pattern/testdocs/.living-doc.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/fixtures/parser-cat-only-pattern/testdocs/[Topic]_sample_doc.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/fixtures/parser-date-only-pattern/testdocs/.living-doc.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/fixtures/parser-date-only-pattern/testdocs/2026_01_15_simple_note.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/fixtures/parser-fallbacks/testdocs/.living-doc.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/fixtures/parser-fallbacks/testdocs/2026_01_15_09_30_no_category.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/fixtures/parser-fallbacks/testdocs/random_file.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/fixtures/with-annotations/testdocs/.annotations.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/fixtures/with-annotations/testdocs/.living-doc.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/fixtures/with-annotations/testdocs/2026_01_01_10_00_[General]_intro.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/fixtures/with-diagrams/testdocs/.diagrams.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/fixtures/with-diagrams/testdocs/.living-doc.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/fixtures/with-diagrams/testdocs/2026_01_01_10_00_[General]_overview.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/fixtures/with-extra-files/external.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/fixtures/with-extra-files/testdocs/.living-doc.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/fixtures/with-extra-files/testdocs/2026_01_01_10_00_[General]_inside.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/fixtures/with-metadata/src/sample.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/fixtures/with-metadata/testdocs/.living-doc.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/fixtures/with-metadata/testdocs/.metadata.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/fixtures/with-metadata/testdocs/2026_01_01_10_00_[General]_intro.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/fixtures/with-subfolders/testdocs/.living-doc.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/fixtures/with-subfolders/testdocs/2026_01_01_10_00_[General]_root.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/fixtures/with-subfolders/testdocs/tutorials/2026_01_02_10_00_[Guide]_nested.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/fixtures/with-subfolders/testdocs/tutorials/advanced/2026_01_03_10_00_[Guide]_deep.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/helpers/coverage.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/helpers/fixture.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/helpers/ld-fixture.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/helpers/mcp.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/helpers/server.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/tsconfig.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": true
        },
        {
          "path": "tests/unit/custom-shape-constants.spec.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/unit/parser.spec.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tsconfig.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": true
        },
        {
          "path": "usermanual-documentation/.annotations.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/.diagrams.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/.living-doc.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/.metadata.json",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/1_tutorial/2026_04_11_13_25_[GENERAL]_crer_vos_dossiers.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/1_tutorial/2026_04_11_18_58_[GENERAL]_creer_un_document_dans_un_dossier.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/1_tutorial/2026_04_12_09_00_[GENERAL]_editer_et_sauvegarder.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/1_tutorial/2026_04_12_10_00_[GENERAL]_utiliser_les_snippets.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/2026_04_08_20_52_[GENERAL]_welcome.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/2026_04_11_12_55_[GENERAL]_premiers_pas.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/2_guide/2026_04_08_00_04_[DOCUMENT]_utilisation_des_images_plein_ecran_lien_clickable.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/2_guide/2026_04_08_23_38_[CONFIGURATION]_demarrage_de_living_documentation.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/2_guide/2026_04_09_09_00_[NAVIGATION]_recherche_plein_texte.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/2_guide/2026_04_09_10_00_[EXPORT]_exporter_en_pdf.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/2_guide/2026_04_09_11_00_[CONFIGURATION]_configurer_le_panneau_admin.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/2_guide/2026_04_09_12_00_[CONFIGURATION]_extra_files.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/2_guide/2026_04_09_13_00_[WORDCLOUD]_word_cloud.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/3_concept/2026_04_08_20_58_[DOCUMENTING]_ADRS.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/3_concept/2026_04_08_22_15_[DOCUMENTING]_living_documentation.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/3_concept/2026_04_08_22_46_[METHODOLOGY]_diataxis_architecture_du_contenu.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/4_reference/2026_04_08_23_14_[FUNDAMENTALS]_the_living_documentation_tool.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/4_reference/2026_04_09_01_00_[REFERENCE]_raccourcis_clavier.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/4_reference/2026_04_09_02_00_[REFERENCE]_tokens_pattern_nommage.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/4_reference/2026_04_09_03_00_[REFERENCE]_types_de_snippets.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/4_reference/2026_04_11_17_31_[FUNDAMENTALS]_architecturer_une_documentation.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/4_reference/2026_04_12_14_07_[FUNDAMENTALS]_dossiers_et_catgories.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/5_talks/2026_04_28_09_48_[CONFERENCE]_demo_living_documentation_mcp_en_conference.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/images/admin_screenshot.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/images/ajout-document.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/images/ajouter-document-categorie.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/images/ajouter_un_document_dans_un_dossier.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/images/architecturer_une_documentation_reference.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/images/cr_er_un_document.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/images/creation-nouveau-dossier.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/images/creer-document-context-engineering.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/images/creer-dossier-only-tutoriel.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/images/creer-dossier-tutoriel.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/images/creer-dossiers-done.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/images/creer-un-document.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/images/creer-vos-dossiers-tutoriel.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/images/creer-vos-dossiers.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/images/decouverte_adrs.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/images/diataxis.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/images/diataxis_callout.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/images/document-cree.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/images/liens_snippets.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/images/living_documentation.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/images/living_documentation_context_demo_conf.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/images/npm_logo.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/images/popup-creer-document.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/images/popup-creer-dossier.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/images/popup-dossier-cree.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/images/quatre-dossiers-crees.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/images/screenshot-living-doc.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "usermanual-documentation/images/the_living_documentation_tool.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        }
      ]
    },
    {
      "sha": "85af62be0d36ad6349d7edca459e083fc755fbd8",
      "shortSha": "85af62be",
      "committerDate": "2026-05-11T19:16:27+02:00",
      "authorDate": "2026-05-11T19:16:27+02:00",
      "author": "Medaghri-Alaoui Youssef",
      "subject": "8.0.0",
      "body": "",
      "parents": 1,
      "state": "trivial",
      "filesChanged": [
        {
          "path": "package-lock.json",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": true
        },
        {
          "path": "package.json",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": true
        }
      ]
    },
    {
      "sha": "ae077a9f0f1797e8620ef408672811cb4082c159",
      "shortSha": "ae077a9f",
      "committerDate": "2026-05-11T19:44:00+02:00",
      "authorDate": "2026-05-11T19:44:00+02:00",
      "author": "Medaghri-Alaoui Youssef",
      "subject": "feat(Genarating MCP documents for enhancing the behaviors):",
      "body": "",
      "parents": 1,
      "state": "candidate",
      "filesChanged": [
        {
          "path": "documentation/.metadata.json",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_05_11_19_33_[AI_CONTEXT]_affichage_detail_erreur_appels_mcp_page_context.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_05_11_19_41_[FRONTEND]_copie_id_document_mcp_depuis_entete_viewer.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/001-tool-get-server-guide.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/002-tool-list-documents.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/003-tool-create-document.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/004-tool-list-diagrams.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/005-tool-list-source-files.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/006-tool-list-documents-below-accuracy.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/007-prompt-audit-doc-drift.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/008-prompt-create-adr.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/009-prompt-generate-context-diagram.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/010-prompt-generate-container-diagram.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/011-prompt-generate-uml-diagram.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/012-prompt-update-diagram-from-docs.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/013-prompt-generate-screen-guide.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/014-prompt-flow.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/015-prompt-erd.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/016-tool-read-document.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/PROJECT-STACK.md",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/context.html",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/i18n/en.json",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/i18n/fr.json",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/index.html",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/misc.js",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/e2e/context.spec.ts",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/e2e/viewer.spec.ts",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        }
      ]
    },
    {
      "sha": "a99e6d934e2b75bd8e8cb3073ea1d163d5789f58",
      "shortSha": "a99e6d93",
      "committerDate": "2026-05-11T20:00:09+02:00",
      "authorDate": "2026-05-11T20:00:09+02:00",
      "author": "Medaghri-Alaoui Youssef",
      "subject": "docs(updating docs):",
      "body": "",
      "parents": 1,
      "state": "candidate",
      "filesChanged": [
        {
          "path": "documentation/.annotations.json",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/.diagrams.json",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/1_tutorial/2026_04_11_13_25_[General]_crer_vos_dossiers.md",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/1_tutorial/2026_04_11_18_58_[General]_creer_un_document_dans_un_dossier.md",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/1_tutorial/2026_04_12_09_00_[General]_editer_et_sauvegarder.md",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/1_tutorial/2026_04_12_10_00_[General]_utiliser_les_snippets.md",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/2026_04_08_20_52_[General]_welcome.md",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/2026_04_11_12_55_[General]_premiers_pas.md",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/2_guide/2026_04_08_00_04_[DOCUMENT]_utilisation_des_images_plein_ecran_lien_clickable.md",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/2_guide/2026_04_08_23_38_[Configuration]_demarrage_de_living_documentation.md",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/2_guide/2026_04_09_09_00_[NAVIGATION]_recherche_plein_texte.md",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/2_guide/2026_04_09_10_00_[EXPORT]_exporter_en_pdf.md",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/2_guide/2026_04_09_11_00_[Configuration]_configurer_le_panneau_admin.md",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/2_guide/2026_04_09_12_00_[Configuration]_extra_files.md",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/2_guide/2026_04_09_13_00_[WORDCLOUD]_word_cloud.md",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/3_concept/2026_04_08_20_58_[DOCUMENTING]_ADRS.md",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/3_concept/2026_04_08_22_15_[DOCUMENTING]_living_documentation.md",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/3_concept/2026_04_08_22_46_[METHODOLOGY]_diataxis_architecture_du_contenu.md",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/4_reference/2026_04_08_23_14_[FUNDAMENTALS]_the_living_documentation_tool.md",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/4_reference/2026_04_09_01_00_[REFERENCE]_raccourcis_clavier.md",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/4_reference/2026_04_09_02_00_[REFERENCE]_tokens_pattern_nommage.md",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/4_reference/2026_04_09_03_00_[REFERENCE]_types_de_snippets.md",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/4_reference/2026_04_11_17_31_[FUNDAMENTALS]_architecturer_une_documentation.md",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/4_reference/2026_04_12_14_07_[FUNDAMENTALS]_dossiers_et_catgories.md",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/5_talks/2026_04_28_09_48_[CONFERENCE]_demo_living_documentation_mcp_en_conference.md",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/admin_screenshot.png",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/ajout-document.png",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/ajouter-document-categorie.png",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/ajouter_un_document_dans_un_dossier.png",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/architecturer_une_documentation_reference.png",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/cr_er_un_document.png",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/creation-nouveau-dossier.png",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/creer-document-context-engineering.png",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/creer-dossier-only-tutoriel.png",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/creer-dossier-tutoriel.png",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/creer-dossiers-done.png",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/creer-un-document.png",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/creer-vos-dossiers-tutoriel.png",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/creer-vos-dossiers.png",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/decouverte_adrs.png",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/diataxis.png",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/diataxis_callout.png",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/document-cree.png",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/liens_snippets.png",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/living_documentation.png",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/living_documentation_context_demo_conf.png",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/npm_logo.png",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/popup-creer-document.png",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/popup-creer-dossier.png",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/popup-dossier-cree.png",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/quatre-dossiers-crees.png",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/screenshot-living-doc.png",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/the_living_documentation_tool.png",
          "changeType": "R",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/.living-doc.json",
          "changeType": "D",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "example-doc/.metadata.json",
          "changeType": "D",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        }
      ]
    },
    {
      "sha": "dcdf3a80aa203dfbf0590ee10b66a957957a4d99",
      "shortSha": "dcdf3a80",
      "committerDate": "2026-05-11T22:45:10+02:00",
      "authorDate": "2026-05-11T22:45:10+02:00",
      "author": "Medaghri-Alaoui Youssef",
      "subject": "feat(Adding MCP Prompt And Tool for adr relevance calculation):",
      "body": "",
      "parents": 1,
      "state": "candidate",
      "filesChanged": [
        {
          "path": "documentation/.metadata.json",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/2026_05_11_22_13_[General]_document.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_05_11_16_08_[AI_CONTEXT]_mcp_explorer_saves_run_results_as_markdown_documents_in_ai_mcp_folder.md",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_05_11_20_03_[DIAGRAM]_copie_id_diagramme_mcp_depuis_topbar_editeur.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_05_11_22_33_[MCP]_review_adr_relevance_mcp_tool.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/001-tool-get-server-guide.md",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/002-tool-list-documents.md",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/003-tool-create-document.md",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/004-tool-list-diagrams.md",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/005-tool-list-source-files.md",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/006-tool-list-documents-below-accuracy.md",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/016-tool-read-document.md",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/017-tool-read-diagram.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/018-tool-search-source.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/019-tool-get-accuracy.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/020-tool-list-metadata.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/021-tool-read-source-file.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/022-tool-refresh-metadata.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/023-prompt-review-adr-relevance.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/context.html",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/diagram.html",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/diagram/main.js",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/i18n/en.json",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/i18n/fr.json",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/mcp/server.ts",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/mcp/tools/metadata.ts",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/api/mcp.spec.ts",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/e2e/context.spec.ts",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/e2e/diagram.spec.ts",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        }
      ]
    },
    {
      "sha": "d40bb5c7b4767d47a5283dc8f8f92d4d95d6aafe",
      "shortSha": "d40bb5c7",
      "committerDate": "2026-05-11T22:45:17+02:00",
      "authorDate": "2026-05-11T22:45:17+02:00",
      "author": "Medaghri-Alaoui Youssef",
      "subject": "8.1.0",
      "body": "",
      "parents": 1,
      "state": "trivial",
      "filesChanged": [
        {
          "path": "package-lock.json",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": true
        },
        {
          "path": "package.json",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": true
        }
      ]
    },
    {
      "sha": "dbc7fc3fd51cf7dfea6a377634a062c6d6a4732e",
      "shortSha": "dbc7fc3f",
      "committerDate": "2026-05-11T23:05:08+02:00",
      "authorDate": "2026-05-11T23:05:08+02:00",
      "author": "Medaghri-Alaoui Youssef",
      "subject": "fix(Fixing MCP Tools and prompt audit adrs drift):",
      "body": "",
      "parents": 1,
      "state": "candidate",
      "filesChanged": [
        {
          "path": "documentation/.metadata.json",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_05_11_22_33_[MCP]_review_adr_relevance_mcp_tool.md",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/001-tool-get-server-guide.md",
          "changeType": "D",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/002-tool-list-documents.md",
          "changeType": "D",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/003-tool-create-document.md",
          "changeType": "D",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/004-tool-list-diagrams.md",
          "changeType": "D",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/005-tool-list-source-files.md",
          "changeType": "D",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/006-tool-list-documents-below-accuracy.md",
          "changeType": "D",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/007-prompt-audit-doc-drift.md",
          "changeType": "D",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/008-prompt-create-adr.md",
          "changeType": "D",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/009-prompt-generate-context-diagram.md",
          "changeType": "D",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/010-prompt-generate-container-diagram.md",
          "changeType": "D",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/011-prompt-generate-uml-diagram.md",
          "changeType": "D",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/012-prompt-update-diagram-from-docs.md",
          "changeType": "D",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/013-prompt-generate-screen-guide.md",
          "changeType": "D",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/014-prompt-flow.md",
          "changeType": "D",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/015-prompt-erd.md",
          "changeType": "D",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/016-tool-read-document.md",
          "changeType": "D",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/017-tool-read-diagram.md",
          "changeType": "D",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/018-tool-search-source.md",
          "changeType": "D",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/019-tool-get-accuracy.md",
          "changeType": "D",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/020-tool-list-metadata.md",
          "changeType": "D",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/021-tool-read-source-file.md",
          "changeType": "D",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/022-tool-refresh-metadata.md",
          "changeType": "D",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/023-prompt-review-adr-relevance.md",
          "changeType": "D",
          "underSourceRoot": true,
          "existsNow": false,
          "godFileSuspect": false
        },
        {
          "path": "src/mcp/server.ts",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/mcp/tools/metadata.ts",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "tests/api/mcp.spec.ts",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        }
      ]
    },
    {
      "sha": "a1258af8fe95d3eaad619d10f5ab304faf2a2f23",
      "shortSha": "a1258af8",
      "committerDate": "2026-05-11T23:05:12+02:00",
      "authorDate": "2026-05-11T23:05:12+02:00",
      "author": "Medaghri-Alaoui Youssef",
      "subject": "8.2.0",
      "body": "",
      "parents": 1,
      "state": "trivial",
      "filesChanged": [
        {
          "path": "package-lock.json",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": true
        },
        {
          "path": "package.json",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": true
        }
      ]
    },
    {
      "sha": "73bc66f26e74695ce6180f4307f50d00bd6d6270",
      "shortSha": "73bc66f2",
      "committerDate": "2026-05-12T00:02:08+02:00",
      "authorDate": "2026-05-12T00:02:08+02:00",
      "author": "Medaghri-Alaoui Youssef",
      "subject": "fix(TopBar label and docs):",
      "body": "",
      "parents": 1,
      "state": "candidate",
      "filesChanged": [
        {
          "path": "documentation/.diagrams.json",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/1_tutorial/2026_04_11_13_25_[General]_crer_vos_dossiers.md",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/ADRS/2026_04_03_10_40_[DIAGRAM]_modularisation_javascript.md",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/001-tool-list-adrs-below-accuracy.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/002-prompt-audit-adrs-drift.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/ajouter_un_document_dans_un_dossier.png",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/cr_er_un_document.png",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/cr_er_vos_dossiers_tutoriel.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/graphe_de_d_pendances_des_modules_diagram_js.png",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/the_living_documentation_tool.png",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/i18n/en.json",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "src/frontend/i18n/fr.json",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        }
      ]
    },
    {
      "sha": "8b1fa4d6b9437e3e44412661d302533395e5958d",
      "shortSha": "8b1fa4d6",
      "committerDate": "2026-05-12T00:02:11+02:00",
      "authorDate": "2026-05-12T00:02:11+02:00",
      "author": "Medaghri-Alaoui Youssef",
      "subject": "8.3.0",
      "body": "",
      "parents": 1,
      "state": "trivial",
      "filesChanged": [
        {
          "path": "package-lock.json",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": true
        },
        {
          "path": "package.json",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": true
        }
      ]
    },
    {
      "sha": "38a577e8cd723e3436fe4597bf3d266b0d656a14",
      "shortSha": "38a577e8",
      "committerDate": "2026-05-12T00:08:00+02:00",
      "authorDate": "2026-05-12T00:08:00+02:00",
      "author": "Medaghri-Alaoui Youssef",
      "subject": "fix(Docs and diagrams):",
      "body": "",
      "parents": 1,
      "state": "candidate",
      "filesChanged": [
        {
          "path": "documentation/.diagrams.json",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/AI/MCP/003-prompt-erd.md",
          "changeType": "A",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        },
        {
          "path": "documentation/images/cr_er_vos_dossiers_tutoriel.png",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": false
        }
      ]
    },
    {
      "sha": "44419f5b5c7d96d5e1cf528cacc40cd4fc76cacd",
      "shortSha": "44419f5b",
      "committerDate": "2026-05-12T00:08:02+02:00",
      "authorDate": "2026-05-12T00:08:02+02:00",
      "author": "Medaghri-Alaoui Youssef",
      "subject": "8.4.0",
      "body": "",
      "parents": 1,
      "state": "trivial",
      "filesChanged": [
        {
          "path": "package-lock.json",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": true
        },
        {
          "path": "package.json",
          "changeType": "M",
          "underSourceRoot": true,
          "existsNow": true,
          "godFileSuspect": true
        }
      ]
    }
  ]
}
```
