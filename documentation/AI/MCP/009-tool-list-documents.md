# MCP tool: `list_documents`

## Description

List all documents with their id, title, category, folder, and `linkHref` (the ready-to-paste `?doc=...` segment for a Markdown cross-doc link — copy it verbatim, do not re-encode). Documents are the source of truth — read them before creating or updating any diagram. If unsure of the workflow, call `get_server_guide` first.

## Schéma d'entrée

```json
{
  "type": "object",
  "properties": {}
}
```

## Requête effectuée

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "list_documents",
    "arguments": {}
  }
}
```

## Résultat

```json
[
  {
    "id": "%2FUsers%2Fymedaghri%2FDocuments%2FRepositories%2FMedaghri-Alaoui-Repositories%2F09_My_Published_Projects%2Fliving-documentation%2FREADME",
    "title": "README",
    "category": "General",
    "folder": null,
    "linkHref": "?doc=%252FUsers%252Fymedaghri%252FDocuments%252FRepositories%252FMedaghri-Alaoui-Repositories%252F09_My_Published_Projects%252Fliving-documentation%252FREADME"
  },
  {
    "id": "000_BLUEPRINT%2F2026_06_01_17_40_%5BSCRIPTS%5D_scripts",
    "title": "Scripts",
    "category": "SCRIPTS",
    "folder": "000_BLUEPRINT",
    "linkHref": "?doc=000_BLUEPRINT%252F2026_06_01_17_40_%255BSCRIPTS%255D_scripts"
  },
  {
    "id": "000_BLUEPRINT%2F2026_06_24_19_32_%5BBIN%5D_bin",
    "title": "Bin",
    "category": "BIN",
    "folder": "000_BLUEPRINT",
    "linkHref": "?doc=000_BLUEPRINT%252F2026_06_24_19_32_%255BBIN%255D_bin"
  },
  {
    "id": "000_BLUEPRINT%2F2026_06_24_20_34_%5BDOCUMENTATION%5D_documentation",
    "title": "Documentation",
    "category": "DOCUMENTATION",
    "folder": "000_BLUEPRINT",
    "linkHref": "?doc=000_BLUEPRINT%252F2026_06_24_20_34_%255BDOCUMENTATION%255D_documentation"
  },
  {
    "id": "000_BLUEPRINT%2F2026_06_24_20_37_%5BSTARTER_DOC_FR%5D_starterdocfr",
    "title": "Starterdocfr",
    "category": "STARTER_DOC_FR",
    "folder": "000_BLUEPRINT",
    "linkHref": "?doc=000_BLUEPRINT%252F2026_06_24_20_37_%255BSTARTER_DOC_FR%255D_starterdocfr"
  },
  {
    "id": "000_BLUEPRINT%2F2026_06_24_20_38_%5BSTARTER_DOC%5D_starterdoc",
    "title": "Starterdoc",
    "category": "STARTER_DOC",
    "folder": "000_BLUEPRINT",
    "linkHref": "?doc=000_BLUEPRINT%252F2026_06_24_20_38_%255BSTARTER_DOC%255D_starterdoc"
  },
  {
    "id": "000_BLUEPRINT%2F2026_06_24_20_52_%5BTESTS%5D_tests",
    "title": "Tests",
    "category": "TESTS",
    "folder": "000_BLUEPRINT",
    "linkHref": "?doc=000_BLUEPRINT%252F2026_06_24_20_52_%255BTESTS%255D_tests"
  },
  {
    "id": "000_BLUEPRINT%2F2026_06_24_20_54_%5BTEST_RESULTS%5D_testresults",
    "title": "Testresults",
    "category": "TEST_RESULTS",
    "folder": "000_BLUEPRINT",
    "linkHref": "?doc=000_BLUEPRINT%252F2026_06_24_20_54_%255BTEST_RESULTS%255D_testresults"
  },
  {
    "id": "000_BLUEPRINT%2F2026_06_24_20_55_%5BPLAYWRIGHT_REPORT%5D_playwrightreport",
    "title": "Playwrightreport",
    "category": "PLAYWRIGHT_REPORT",
    "folder": "000_BLUEPRINT",
    "linkHref": "?doc=000_BLUEPRINT%252F2026_06_24_20_55_%255BPLAYWRIGHT_REPORT%255D_playwrightreport"
  },
  {
    "id": "000_BLUEPRINT%2F2026_06_24_20_56_%5BGRAPHIFY_OUT%5D_graphifyout",
    "title": "Graphifyout",
    "category": "GRAPHIFY_OUT",
    "folder": "000_BLUEPRINT",
    "linkHref": "?doc=000_BLUEPRINT%252F2026_06_24_20_56_%255BGRAPHIFY_OUT%255D_graphifyout"
  },
  {
    "id": "000_BLUEPRINT%2F2026_06_24_20_57_%5BSRC%5D_src",
    "title": "Src",
    "category": "SRC",
    "folder": "000_BLUEPRINT",
    "linkHref": "?doc=000_BLUEPRINT%252F2026_06_24_20_57_%255BSRC%255D_src"
  },
  {
    "id": "1_tutorial%2F2026_04_11_13_25_%5BGeneral%5D_crer_vos_dossiers",
    "title": "Crer Vos Dossiers",
    "category": "General",
    "folder": "1_tutorial",
    "linkHref": "?doc=1_tutorial%252F2026_04_11_13_25_%255BGeneral%255D_crer_vos_dossiers"
  },
  {
    "id": "1_tutorial%2F2026_04_11_18_58_%5BGeneral%5D_creer_un_document_dans_un_dossier",
    "title": "Creer Un Document Dans Un Dossier",
    "category": "General",
    "folder": "1_tutorial",
    "linkHref": "?doc=1_tutorial%252F2026_04_11_18_58_%255BGeneral%255D_creer_un_document_dans_un_dossier"
  },
  {
    "id": "1_tutorial%2F2026_04_12_09_00_%5BGeneral%5D_editer_et_sauvegarder",
    "title": "Editer Et Sauvegarder",
    "category": "General",
    "folder": "1_tutorial",
    "linkHref": "?doc=1_tutorial%252F2026_04_12_09_00_%255BGeneral%255D_editer_et_sauvegarder"
  },
  {
    "id": "1_tutorial%2F2026_04_12_10_00_%5BGeneral%5D_utiliser_les_snippets",
    "title": "Utiliser Les Snippets",
    "category": "General",
    "folder": "1_tutorial",
    "linkHref": "?doc=1_tutorial%252F2026_04_12_10_00_%255BGeneral%255D_utiliser_les_snippets"
  },
  {
    "id": "2026_04_08_20_52_%5BGeneral%5D_welcome",
    "title": "Welcome",
    "category": "General",
    "folder": null,
    "linkHref": "?doc=2026_04_08_20_52_%255BGeneral%255D_welcome"
  },
  {
    "id": "2026_04_11_12_55_%5BGeneral%5D_premiers_pas",
    "title": "Premiers Pas",
    "category": "General",
    "folder": null,
    "linkHref": "?doc=2026_04_11_12_55_%255BGeneral%255D_premiers_pas"
  },
  {
    "id": "2026_05_20_13_28_%5BCONFERENCE%5D_test",
    "title": "Test",
    "category": "CONFERENCE",
    "folder": null,
    "linkHref": "?doc=2026_05_20_13_28_%255BCONFERENCE%255D_test"
  },
  {
    "id": "2026_06_03_23_19_%5BTESTING%5D_stabilisation_de_la_suite_e2e_playwright_apres_migration_svelte_ancrage_de_test_et_regressions",
    "title": "Stabilisation De La Suite E2e Playwright Apres Migration Svelte Ancrage De Test Et Regressions",
    "category": "TESTING",
    "folder": null,
    "linkHref": "?doc=2026_06_03_23_19_%255BTESTING%255D_stabilisation_de_la_suite_e2e_playwright_apres_migration_svelte_ancrage_de_test_et_regressions"
  },
  {
    "id": "2026_06_03_23_20_%5BCI%5D_durcissement_securite_des_workflows_github_actions_avec_zizmor_pin_sha_permissions_et_persistcredentials",
    "title": "Durcissement Securite Des Workflows Github Actions Avec Zizmor Pin Sha Permissions Et Persistcredentials",
    "category": "CI",
    "folder": null,
    "linkHref": "?doc=2026_06_03_23_20_%255BCI%255D_durcissement_securite_des_workflows_github_actions_avec_zizmor_pin_sha_permissions_et_persistcredentials"
  },
  {
    "id": "2026_06_08_00_17_%5BFRONTEND%5D_compare_block_two_phase_rendering",
    "title": "Compare Block Two Phase Rendering",
    "category": "FRONTEND",
    "folder": null,
    "linkHref": "?doc=2026_06_08_00_17_%255BFRONTEND%255D_compare_block_two_phase_rendering"
  },
  {
    "id": "2_guide%2F2026_04_08_00_04_%5BDOCUMENT%5D_utilisation_des_images_plein_ecran_lien_clickable",
    "title": "Utilisation Des Images Plein Ecran Lien Clickable",
    "category": "DOCUMENT",
    "folder": "2_guide",
    "linkHref": "?doc=2_guide%252F2026_04_08_00_04_%255BDOCUMENT%255D_utilisation_des_images_plein_ecran_lien_clickable"
  },
  {
    "id": "2_guide%2F2026_04_08_23_38_%5BConfiguration%5D_demarrage_de_living_documentation",
    "title": "Demarrage De Living Documentation",
    "category": "Configuration",
    "folder": "2_guide",
    "linkHref": "?doc=2_guide%252F2026_04_08_23_38_%255BConfiguration%255D_demarrage_de_living_documentation"
  },
  {
    "id": "2_guide%2F2026_04_09_09_00_%5BNAVIGATION%5D_recherche_plein_texte",
    "title": "Recherche Plein Texte",
    "category": "NAVIGATION",
    "folder": "2_guide",
    "linkHref": "?doc=2_guide%252F2026_04_09_09_00_%255BNAVIGATION%255D_recherche_plein_texte"
  },
  {
    "id": "2_guide%2F2026_04_09_10_00_%5BEXPORT%5D_exporter_en_pdf",
    "title": "Exporter En Pdf",
    "category": "EXPORT",
    "folder": "2_guide",
    "linkHref": "?doc=2_guide%252F2026_04_09_10_00_%255BEXPORT%255D_exporter_en_pdf"
  },
  {
    "id": "2_guide%2F2026_04_09_11_00_%5BConfiguration%5D_configurer_le_panneau_admin",
    "title": "Configurer Le Panneau Admin",
    "category": "Configuration",
    "folder": "2_guide",
    "linkHref": "?doc=2_guide%252F2026_04_09_11_00_%255BConfiguration%255D_configurer_le_panneau_admin"
  },
  {
    "id": "2_guide%2F2026_04_09_12_00_%5BConfiguration%5D_extra_files",
    "title": "Extra Files",
    "category": "Configuration",
    "folder": "2_guide",
    "linkHref": "?doc=2_guide%252F2026_04_09_12_00_%255BConfiguration%255D_extra_files"
  },
  {
    "id": "2_guide%2F2026_04_09_13_00_%5BWORDCLOUD%5D_word_cloud",
    "title": "Word Cloud",
    "category": "WORDCLOUD",
    "folder": "2_guide",
    "linkHref": "?doc=2_guide%252F2026_04_09_13_00_%255BWORDCLOUD%255D_word_cloud"
  },
  {
    "id": "2_guide%2F2026_04_09_14_00_%5BDIAGRAM%5D_creer_et_lier_un_diagramme",
    "title": "Creer Et Lier Un Diagramme",
    "category": "DIAGRAM",
    "folder": "2_guide",
    "linkHref": "?doc=2_guide%252F2026_04_09_14_00_%255BDIAGRAM%255D_creer_et_lier_un_diagramme"
  },
  {
    "id": "2_guide%2F2026_04_10_10_00_%5BGUIDE%5D_annotations",
    "title": "Annotations",
    "category": "GUIDE",
    "folder": "2_guide",
    "linkHref": "?doc=2_guide%252F2026_04_10_10_00_%255BGUIDE%255D_annotations"
  },
  {
    "id": "2_guide%2F2026_04_21_10_00_%5BGUIDE%5D_fichiers_joints",
    "title": "Fichiers Joints",
    "category": "GUIDE",
    "folder": "2_guide",
    "linkHref": "?doc=2_guide%252F2026_04_21_10_00_%255BGUIDE%255D_fichiers_joints"
  },
  {
    "id": "2_guide%2F2026_04_22_10_00_%5BGUIDE%5D_metadonnees_sources",
    "title": "Metadonnees Sources",
    "category": "GUIDE",
    "folder": "2_guide",
    "linkHref": "?doc=2_guide%252F2026_04_22_10_00_%255BGUIDE%255D_metadonnees_sources"
  },
  {
    "id": "2_guide%2F2026_05_17_20_00_%5BGUIDE%5D_edition_inline_snippets",
    "title": "Edition Inline Snippets",
    "category": "GUIDE",
    "folder": "2_guide",
    "linkHref": "?doc=2_guide%252F2026_05_17_20_00_%255BGUIDE%255D_edition_inline_snippets"
  },
  {
    "id": "2_guide%2F2026_06_06_16_00_%5BGUIDE%5D_table_des_matieres",
    "title": "Table Des Matieres",
    "category": "GUIDE",
    "folder": "2_guide",
    "linkHref": "?doc=2_guide%252F2026_06_06_16_00_%255BGUIDE%255D_table_des_matieres"
  },
  {
    "id": "2_guide%2F2026_06_06_21_00_%5BGUIDE%5D_styles_images_et_code",
    "title": "Styles Images Et Code",
    "category": "GUIDE",
    "folder": "2_guide",
    "linkHref": "?doc=2_guide%252F2026_06_06_21_00_%255BGUIDE%255D_styles_images_et_code"
  },
  {
    "id": "2_guide%2Fexamples%2F2026_04_06_10_00_%5BINTRO%5D_snippets",
    "title": "Snippets",
    "category": "INTRO",
    "folder": "2_guide/examples",
    "linkHref": "?doc=2_guide%252Fexamples%252F2026_04_06_10_00_%255BINTRO%255D_snippets"
  },
  {
    "id": "2_guide%2Fexamples%2F2026_04_08_13_00_%5BSAMPLES%5D_arborescence",
    "title": "Arborescence",
    "category": "SAMPLES",
    "folder": "2_guide/examples",
    "linkHref": "?doc=2_guide%252Fexamples%252F2026_04_08_13_00_%255BSAMPLES%255D_arborescence"
  },
  {
    "id": "2_guide%2Fexamples%2F2026_04_08_16_00_%5BSAMPLES%5D_liens",
    "title": "Liens",
    "category": "SAMPLES",
    "folder": "2_guide/examples",
    "linkHref": "?doc=2_guide%252Fexamples%252F2026_04_08_16_00_%255BSAMPLES%255D_liens"
  },
  {
    "id": "2_guide%2Fexamples%2F2026_04_14_14_00_%5BSAMPLES%5D_sections_colorees",
    "title": "Sections Colorees",
    "category": "SAMPLES",
    "folder": "2_guide/examples",
    "linkHref": "?doc=2_guide%252Fexamples%252F2026_04_14_14_00_%255BSAMPLES%255D_sections_colorees"
  },
  {
    "id": "2_guide%2Fexamples%2F2026_04_22_16_00_%5BSAMPLES%5D_emojis",
    "title": "Emojis",
    "category": "SAMPLES",
    "folder": "2_guide/examples",
    "linkHref": "?doc=2_guide%252Fexamples%252F2026_04_22_16_00_%255BSAMPLES%255D_emojis"
  },
  {
    "id": "2_guide%2Fexamples%2F2026_04_23_14_00_%5BSAMPLES%5D_blocs_de_code",
    "title": "Blocs De Code",
    "category": "SAMPLES",
    "folder": "2_guide/examples",
    "linkHref": "?doc=2_guide%252Fexamples%252F2026_04_23_14_00_%255BSAMPLES%255D_blocs_de_code"
  },
  {
    "id": "2_guide%2Fexamples%2F2026_06_06_19_00_%5BSAMPLES%5D_tableaux",
    "title": "Tableaux",
    "category": "SAMPLES",
    "folder": "2_guide/examples",
    "linkHref": "?doc=2_guide%252Fexamples%252F2026_06_06_19_00_%255BSAMPLES%255D_tableaux"
  },
  {
    "id": "2_guide%2Fexamples%2F2026_06_07_11_47_%5BSAMPLES%5D_citations",
    "title": "Citations",
    "category": "SAMPLES",
    "folder": "2_guide/examples",
    "linkHref": "?doc=2_guide%252Fexamples%252F2026_06_07_11_47_%255BSAMPLES%255D_citations"
  },
  {
    "id": "3_concept%2F2026_04_08_20_58_%5BDOCUMENTING%5D_ADRS",
    "title": "Adrs",
    "category": "DOCUMENTING",
    "folder": "3_concept",
    "linkHref": "?doc=3_concept%252F2026_04_08_20_58_%255BDOCUMENTING%255D_ADRS"
  },
  {
    "id": "3_concept%2F2026_04_08_22_15_%5BDOCUMENTING%5D_living_documentation",
    "title": "Living Documentation",
    "category": "DOCUMENTING",
    "folder": "3_concept",
    "linkHref": "?doc=3_concept%252F2026_04_08_22_15_%255BDOCUMENTING%255D_living_documentation"
  },
  {
    "id": "3_concept%2F2026_04_08_22_46_%5BMETHODOLOGY%5D_diataxis_architecture_du_contenu",
    "title": "Diataxis Architecture Du Contenu",
    "category": "METHODOLOGY",
    "folder": "3_concept",
    "linkHref": "?doc=3_concept%252F2026_04_08_22_46_%255BMETHODOLOGY%255D_diataxis_architecture_du_contenu"
  },
  {
    "id": "4_reference%2F2026_04_08_23_14_%5BFUNDAMENTALS%5D_the_living_documentation_tool",
    "title": "The Living Documentation Tool",
    "category": "FUNDAMENTALS",
    "folder": "4_reference",
    "linkHref": "?doc=4_reference%252F2026_04_08_23_14_%255BFUNDAMENTALS%255D_the_living_documentation_tool"
  },
  {
    "id": "4_reference%2F2026_04_09_01_00_%5BREFERENCE%5D_raccourcis_clavier",
    "title": "Raccourcis Clavier",
    "category": "REFERENCE",
    "folder": "4_reference",
    "linkHref": "?doc=4_reference%252F2026_04_09_01_00_%255BREFERENCE%255D_raccourcis_clavier"
  },
  {
    "id": "4_reference%2F2026_04_09_02_00_%5BREFERENCE%5D_tokens_pattern_nommage",
    "title": "Tokens Pattern Nommage",
    "category": "REFERENCE",
    "folder": "4_reference",
    "linkHref": "?doc=4_reference%252F2026_04_09_02_00_%255BREFERENCE%255D_tokens_pattern_nommage"
  },
  {
    "id": "4_reference%2F2026_04_09_03_00_%5BREFERENCE%5D_types_de_snippets",
    "title": "Types De Snippets",
    "category": "REFERENCE",
    "folder": "4_reference",
    "linkHref": "?doc=4_reference%252F2026_04_09_03_00_%255BREFERENCE%255D_types_de_snippets"
  },
  {
    "id": "4_reference%2F2026_04_11_17_31_%5BFUNDAMENTALS%5D_architecturer_une_documentation",
    "title": "Architecturer Une Documentation",
    "category": "FUNDAMENTALS",
    "folder": "4_reference",
    "linkHref": "?doc=4_reference%252F2026_04_11_17_31_%255BFUNDAMENTALS%255D_architecturer_une_documentation"
  },
  {
    "id": "4_reference%2F2026_04_12_14_07_%5BFUNDAMENTALS%5D_dossiers_et_catgories",
    "title": "Dossiers Et Catgories",
    "category": "FUNDAMENTALS",
    "folder": "4_reference",
    "linkHref": "?doc=4_reference%252F2026_04_12_14_07_%255BFUNDAMENTALS%255D_dossiers_et_catgories"
  },
  {
    "id": "5_talks%2F2026_04_28_09_48_%5BCONFERENCE%5D_demo_living_documentation_mcp_en_conference",
    "title": "Demo Living Documentation Mcp En Conference",
    "category": "CONFERENCE",
    "folder": "5_talks",
    "linkHref": "?doc=5_talks%252F2026_04_28_09_48_%255BCONFERENCE%255D_demo_living_documentation_mcp_en_conference"
  },
  {
    "id": "ADRS%2F2026_03_20_10_15_%5BCONFIGURATION%5D_link_extra_files_as_documentation",
    "title": "Link Extra Files As Documentation",
    "category": "CONFIGURATION",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_03_20_10_15_%255BCONFIGURATION%255D_link_extra_files_as_documentation"
  },
  {
    "id": "ADRS%2F2026_03_21_10_25_%5BCONFIGURATION%5D_general_category_and_sidebar_defaults",
    "title": "General Category And Sidebar Defaults",
    "category": "CONFIGURATION",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_03_21_10_25_%255BCONFIGURATION%255D_general_category_and_sidebar_defaults"
  },
  {
    "id": "ADRS%2F2026_03_22_11_10_%5BSTYLE%5D_always_dark_syntax_highlighting",
    "title": "Always Dark Syntax Highlighting",
    "category": "STYLE",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_03_22_11_10_%255BSTYLE%255D_always_dark_syntax_highlighting"
  },
  {
    "id": "ADRS%2F2026_04_03_10_15_%5BDIAGRAM%5D_debug_overlay",
    "title": "Debug Overlay",
    "category": "DIAGRAM",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_03_10_15_%255BDIAGRAM%255D_debug_overlay"
  },
  {
    "id": "ADRS%2F2026_04_03_10_40_%5BDIAGRAM%5D_modularisation_javascript",
    "title": "Modularisation Javascript",
    "category": "DIAGRAM",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_03_10_40_%255BDIAGRAM%255D_modularisation_javascript"
  },
  {
    "id": "ADRS%2F2026_04_03_11_20_%5BDIAGRAM%5D_snap_to_grid",
    "title": "Snap To Grid",
    "category": "DIAGRAM",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_03_11_20_%255BDIAGRAM%255D_snap_to_grid"
  },
  {
    "id": "ADRS%2F2026_04_03_12_05_%5BDIAGRAM%5D_vis_network_z_order_patch",
    "title": "Vis Network Z Order Patch",
    "category": "DIAGRAM",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_03_12_05_%255BDIAGRAM%255D_vis_network_z_order_patch"
  },
  {
    "id": "ADRS%2F2026_04_05_10_50_%5BFRONTEND%5D_word_cloud",
    "title": "Word Cloud",
    "category": "FRONTEND",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_05_10_50_%255BFRONTEND%255D_word_cloud"
  },
  {
    "id": "ADRS%2F2026_04_08_10_30_%5BFRONTEND%5D_strip_frontmatter_from_article_rendering",
    "title": "Strip Frontmatter From Article Rendering",
    "category": "FRONTEND",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_08_10_30_%255BFRONTEND%255D_strip_frontmatter_from_article_rendering"
  },
  {
    "id": "ADRS%2F2026_04_08_12_00_%5BFRONTEND%5D_new_document_creation_modal_with_folder_browser",
    "title": "New Document Creation Modal With Folder Browser",
    "category": "FRONTEND",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_08_12_00_%255BFRONTEND%255D_new_document_creation_modal_with_folder_browser"
  },
  {
    "id": "ADRS%2F2026_04_08_12_20_%5BFILENAME%5D_datetime_precision_in_filename_pattern",
    "title": "Datetime Precision In Filename Pattern",
    "category": "FILENAME",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_08_12_20_%255BFILENAME%255D_datetime_precision_in_filename_pattern"
  },
  {
    "id": "ADRS%2F2026_04_08_13_00_%5BEDITOR%5D_markdown_snippet_inserter_with_detection",
    "title": "Markdown Snippet Inserter With Detection",
    "category": "EDITOR",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_08_13_00_%255BEDITOR%255D_markdown_snippet_inserter_with_detection"
  },
  {
    "id": "ADRS%2F2026_04_08_13_15_%5BNAVIGATION%5D_anchor_scroll_and_folder_sort_convention",
    "title": "Anchor Scroll And Folder Sort Convention",
    "category": "NAVIGATION",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_08_13_15_%255BNAVIGATION%255D_anchor_scroll_and_folder_sort_convention"
  },
  {
    "id": "ADRS%2F2026_04_08_%5BDIAGRAM%5D_edge_label_rotation_stamp_overlay_png_group_fix",
    "title": "Edge Label Rotation Stamp Overlay Png Group Fix",
    "category": "DIAGRAM",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_08_%255BDIAGRAM%255D_edge_label_rotation_stamp_overlay_png_group_fix"
  },
  {
    "id": "ADRS%2F2026_04_10_%5BANNOTATION%5D_marker_highlight_with_anchor_spans_and_dom_traversal",
    "title": "Marker Highlight With Anchor Spans And Dom Traversal",
    "category": "ANNOTATION",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_10_%255BANNOTATION%255D_marker_highlight_with_anchor_spans_and_dom_traversal"
  },
  {
    "id": "ADRS%2F2026_04_12_%5BDIAGRAM%5D_insertion_diagramme_via_snippet_et_sauvegarde_auto_png",
    "title": "Insertion Diagramme Via Snippet Et Sauvegarde Auto Png",
    "category": "DIAGRAM",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_12_%255BDIAGRAM%255D_insertion_diagramme_via_snippet_et_sauvegarde_auto_png"
  },
  {
    "id": "ADRS%2F2026_04_12_%5BSIDEBAR%5D_creation_dossier_icones_font_awesome_et_dossiers_vides_dans_le_drawer",
    "title": "Creation Dossier Icones Font Awesome Et Dossiers Vides Dans Le Drawer",
    "category": "SIDEBAR",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_12_%255BSIDEBAR%255D_creation_dossier_icones_font_awesome_et_dossiers_vides_dans_le_drawer"
  },
  {
    "id": "ADRS%2F2026_04_13_%5BDIAGRAM%5D_node_locking",
    "title": "Node Locking",
    "category": "DIAGRAM",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_13_%255BDIAGRAM%255D_node_locking"
  },
  {
    "id": "ADRS%2F2026_04_13_%5BDIAGRAM%5D_palette_couleurs_admin_et_corrections_editeur",
    "title": "Palette Couleurs Admin Et Corrections Editeur",
    "category": "DIAGRAM",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_13_%255BDIAGRAM%255D_palette_couleurs_admin_et_corrections_editeur"
  },
  {
    "id": "ADRS%2F2026_04_13_%5BDIAGRAM%5D_port_anchored_edges_free_arrows_and_edge_styling",
    "title": "Port Anchored Edges Free Arrows And Edge Styling",
    "category": "DIAGRAM",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_13_%255BDIAGRAM%255D_port_anchored_edges_free_arrows_and_edge_styling"
  },
  {
    "id": "ADRS%2F2026_04_14_%5BDIAGRAM%5D_Undo_Redo_History_Snapshot_Based",
    "title": "Undo Redo History Snapshot Based",
    "category": "DIAGRAM",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_14_%255BDIAGRAM%255D_Undo_Redo_History_Snapshot_Based"
  },
  {
    "id": "ADRS%2F2026_04_14_%5BI18N%5D_internationalization_en_fr_with_json_translation_files",
    "title": "Internationalization En Fr With Json Translation Files",
    "category": "I18N",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_14_%255BI18N%255D_internationalization_en_fr_with_json_translation_files"
  },
  {
    "id": "ADRS%2F2026_04_14_%5BMCP%5D_draft_mcp",
    "title": "Draft Mcp",
    "category": "MCP",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_14_%255BMCP%255D_draft_mcp"
  },
  {
    "id": "ADRS%2F2026_04_14_%5BSNIPPET%5D_colored_section_and_colored_text_snippets",
    "title": "Colored Section And Colored Text Snippets",
    "category": "SNIPPET",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_14_%255BSNIPPET%255D_colored_section_and_colored_text_snippets"
  },
  {
    "id": "ADRS%2F2026_04_15_%5BDIAGRAM%5D_alignment_guides_center_snap_hitbox_fix_and_state_persistence",
    "title": "Alignment Guides Center Snap Hitbox Fix And State Persistence",
    "category": "DIAGRAM",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_15_%255BDIAGRAM%255D_alignment_guides_center_snap_hitbox_fix_and_state_persistence"
  },
  {
    "id": "ADRS%2F2026_04_15_%5BDIAGRAM%5D_edge_label_editor_position_fix_for_port_edges",
    "title": "Edge Label Editor Position Fix For Port Edges",
    "category": "DIAGRAM",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_15_%255BDIAGRAM%255D_edge_label_editor_position_fix_for_port_edges"
  },
  {
    "id": "ADRS%2F2026_04_15_%5BDIAGRAM%5D_finer_grid_and_alignment_guides_closest_node_with_tiebreak",
    "title": "Finer Grid And Alignment Guides Closest Node With Tiebreak",
    "category": "DIAGRAM",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_15_%255BDIAGRAM%255D_finer_grid_and_alignment_guides_closest_node_with_tiebreak"
  },
  {
    "id": "ADRS%2F2026_04_15_%5BDIAGRAM%5D_port_ellipse_database_fix_stamp_bug_and_size_stamp",
    "title": "Port Ellipse Database Fix Stamp Bug And Size Stamp",
    "category": "DIAGRAM",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_15_%255BDIAGRAM%255D_port_ellipse_database_fix_stamp_bug_and_size_stamp"
  },
  {
    "id": "ADRS%2F2026_04_15_%5BEXPORT%5D_html_export_with_notion_and_confluence_zip_modes",
    "title": "Html Export With Notion And Confluence Zip Modes",
    "category": "EXPORT",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_15_%255BEXPORT%255D_html_export_with_notion_and_confluence_zip_modes"
  },
  {
    "id": "ADRS%2F2026_04_20_%5BDIAGRAM%5D_edge_anchor_rehook_on_selection",
    "title": "Edge Anchor Rehook On Selection",
    "category": "DIAGRAM",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_20_%255BDIAGRAM%255D_edge_anchor_rehook_on_selection"
  },
  {
    "id": "ADRS%2F2026_04_20_%5BDIAGRAM%5D_edge_label_resize_box_text_wrap_and_background",
    "title": "Edge Label Resize Box Text Wrap And Background",
    "category": "DIAGRAM",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_20_%255BDIAGRAM%255D_edge_label_resize_box_text_wrap_and_background"
  },
  {
    "id": "ADRS%2F2026_04_20_%5BDIAGRAM%5D_free_arrow_two_click_anchor_pivot_and_snap_to_connect",
    "title": "Free Arrow Two Click Anchor Pivot And Snap To Connect",
    "category": "DIAGRAM",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_20_%255BDIAGRAM%255D_free_arrow_two_click_anchor_pivot_and_snap_to_connect"
  },
  {
    "id": "ADRS%2F2026_04_20_%5BTUTORIAL%5D_interroger_le_mcp_server_avec_curl",
    "title": "Interroger Le Mcp Server Avec Curl",
    "category": "TUTORIAL",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_20_%255BTUTORIAL%255D_interroger_le_mcp_server_avec_curl"
  },
  {
    "id": "ADRS%2F2026_04_21_%5BFILES%5D_file_attachments_paperclip_drag_drop_paste_and_blocked_extensions",
    "title": "File Attachments Paperclip Drag Drop Paste And Blocked Extensions",
    "category": "FILES",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_21_%255BFILES%255D_file_attachments_paperclip_drag_drop_paste_and_blocked_extensions"
  },
  {
    "id": "ADRS%2F2026_04_21_%5BMODAL_UX%5D_folder_picker_unification_click_to_select",
    "title": "Folder Picker Unification Click To Select",
    "category": "MODAL_UX",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_21_%255BMODAL_UX%255D_folder_picker_unification_click_to_select"
  },
  {
    "id": "ADRS%2F2026_04_21_%5BNAVIGATION%5D_anchor_select_dropdowns_and_navhistory_rewind",
    "title": "Anchor Select Dropdowns And Navhistory Rewind",
    "category": "NAVIGATION",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_21_%255BNAVIGATION%255D_anchor_select_dropdowns_and_navhistory_rewind"
  },
  {
    "id": "ADRS%2F2026_04_22_%5BMETADATA%5D_files_management_popup_with_metadata_search_and_accuracy_formula_fix",
    "title": "Files Management Popup With Metadata Search And Accuracy Formula Fix",
    "category": "METADATA",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_22_%255BMETADATA%255D_files_management_popup_with_metadata_search_and_accuracy_formula_fix"
  },
  {
    "id": "ADRS%2F2026_04_22_%5BMETADATA%5D_source_file_bindings_and_accuracy_gauge",
    "title": "Source File Bindings And Accuracy Gauge",
    "category": "METADATA",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_22_%255BMETADATA%255D_source_file_bindings_and_accuracy_gauge"
  },
  {
    "id": "ADRS%2F2026_04_22_%5BSIDEBAR%5D_resizable_drawer_with_persisted_width",
    "title": "Resizable Drawer With Persisted Width",
    "category": "SIDEBAR",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_22_%255BSIDEBAR%255D_resizable_drawer_with_persisted_width"
  },
  {
    "id": "ADRS%2F2026_04_22_%5BSNIPPET%5D_emojis_picker_with_bilingual_tag_search",
    "title": "Emojis Picker With Bilingual Tag Search",
    "category": "SNIPPET",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_22_%255BSNIPPET%255D_emojis_picker_with_bilingual_tag_search"
  },
  {
    "id": "ADRS%2F2026_04_23_%5BCONFIGURATION%5D_exclusive_folder_and_category_expansion_options",
    "title": "Exclusive Folder And Category Expansion Options",
    "category": "CONFIGURATION",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_23_%255BCONFIGURATION%255D_exclusive_folder_and_category_expansion_options"
  },
  {
    "id": "ADRS%2F2026_04_23_%5BEDITOR%5D_image_paste_name_live_sanitization_lowercase_ascii_only",
    "title": "Image Paste Name Live Sanitization Lowercase Ascii Only",
    "category": "EDITOR",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_23_%255BEDITOR%255D_image_paste_name_live_sanitization_lowercase_ascii_only"
  },
  {
    "id": "ADRS%2F2026_04_23_%5BFRONTEND%5D_code_block_collapsible_with_configurable_max_height_and_copy_button",
    "title": "Code Block Collapsible With Configurable Max Height And Copy Button",
    "category": "FRONTEND",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_23_%255BFRONTEND%255D_code_block_collapsible_with_configurable_max_height_and_copy_button"
  },
  {
    "id": "ADRS%2F2026_04_23_%5BFRONTEND%5D_tame_tailwind_typography_defaults_for_inline_images_and_hr",
    "title": "Tame Tailwind Typography Defaults For Inline Images And Hr",
    "category": "FRONTEND",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_23_%255BFRONTEND%255D_tame_tailwind_typography_defaults_for_inline_images_and_hr"
  },
  {
    "id": "ADRS%2F2026_04_23_%5BRENDERING%5D_configurable_markdown_newline_handling_commonmark_vs_gfm_breaks",
    "title": "Configurable Markdown Newline Handling Commonmark Vs Gfm Breaks",
    "category": "RENDERING",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_23_%255BRENDERING%255D_configurable_markdown_newline_handling_commonmark_vs_gfm_breaks"
  },
  {
    "id": "ADRS%2F2026_04_24_%5BCONFIGURATION%5D_portable_living_doc_json_with_relative_paths",
    "title": "Portable Living Doc Json With Relative Paths",
    "category": "CONFIGURATION",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_24_%255BCONFIGURATION%255D_portable_living_doc_json_with_relative_paths"
  },
  {
    "id": "ADRS%2F2026_04_24_%5BTESTING%5D_e2e_tests_with_playwright_and_unified_coverage_via_c8",
    "title": "E2e Tests With Playwright And Unified Coverage Via C8",
    "category": "TESTING",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_24_%255BTESTING%255D_e2e_tests_with_playwright_and_unified_coverage_via_c8"
  },
  {
    "id": "ADRS%2F2026_04_27_%5BPACKAGING%5D_fix_npx_404_via_send_dotfiles_allow",
    "title": "Fix Npx 404 Via Send Dotfiles Allow",
    "category": "PACKAGING",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_04_27_%255BPACKAGING%255D_fix_npx_404_via_send_dotfiles_allow"
  },
  {
    "id": "ADRS%2F2026_05_07_22_05_%5BMCP%5D_default_diagram_style_conventions",
    "title": "Default Diagram Style Conventions",
    "category": "MCP",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_07_22_05_%255BMCP%255D_default_diagram_style_conventions"
  },
  {
    "id": "ADRS%2F2026_05_07_22_25_%5BMCP_DIAGRAM%5D_architectural_kind_render_as_separation",
    "title": "Architectural Kind Render As Separation",
    "category": "MCP_DIAGRAM",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_07_22_25_%255BMCP_DIAGRAM%255D_architectural_kind_render_as_separation"
  },
  {
    "id": "ADRS%2F2026_05_07_22_45_%5BMCP_DIAGRAM%5D_documentary_evidence_provenance",
    "title": "Documentary Evidence Provenance",
    "category": "MCP_DIAGRAM",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_07_22_45_%255BMCP_DIAGRAM%255D_documentary_evidence_provenance"
  },
  {
    "id": "ADRS%2F2026_05_07_23_05_%5BMCP%5D_cross_project_documentation_workspace_confirmation",
    "title": "Cross Project Documentation Workspace Confirmation",
    "category": "MCP",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_07_23_05_%255BMCP%255D_cross_project_documentation_workspace_confirmation"
  },
  {
    "id": "ADRS%2F2026_05_07_23_23_%5BDIAGRAM%5D_layout_deterministe_des_diagrammes_mcp",
    "title": "Layout Deterministe Des Diagrammes Mcp",
    "category": "DIAGRAM",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_07_23_23_%255BDIAGRAM%255D_layout_deterministe_des_diagrammes_mcp"
  },
  {
    "id": "ADRS%2F2026_05_08_20_01_%5BDIAGRAM%5D_custom_shape_libraries_and_variable_ports",
    "title": "Custom Shape Libraries And Variable Ports",
    "category": "DIAGRAM",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_08_20_01_%255BDIAGRAM%255D_custom_shape_libraries_and_variable_ports"
  },
  {
    "id": "ADRS%2F2026_05_08_20_45_%5BDIAGRAM%5D_node_double_click_takes_precedence_over_crossing_edges",
    "title": "Node Double Click Takes Precedence Over Crossing Edges",
    "category": "DIAGRAM",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_08_20_45_%255BDIAGRAM%255D_node_double_click_takes_precedence_over_crossing_edges"
  },
  {
    "id": "ADRS%2F2026_05_08_21_26_%5BDIAGRAM%5D_lower_z_targets_can_be_connected_unless_they_are_background_containers",
    "title": "Lower Z Targets Can Be Connected Unless They Are Background Containers",
    "category": "DIAGRAM",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_08_21_26_%255BDIAGRAM%255D_lower_z_targets_can_be_connected_unless_they_are_background_containers"
  },
  {
    "id": "ADRS%2F2026_05_11_15_40_%5BMCP%5D_server_guide_and_feature_workflow_for_the_mcp",
    "title": "Server Guide And Feature Workflow For The Mcp",
    "category": "MCP",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_11_15_40_%255BMCP%255D_server_guide_and_feature_workflow_for_the_mcp"
  },
  {
    "id": "ADRS%2F2026_05_11_15_41_%5BAI_CONTEXT%5D_ai_context_page_orientation_instructions_rules_and_mcp_explorer",
    "title": "Ai Context Page Orientation Instructions Rules And Mcp Explorer",
    "category": "AI_CONTEXT",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_11_15_41_%255BAI_CONTEXT%255D_ai_context_page_orientation_instructions_rules_and_mcp_explorer"
  },
  {
    "id": "ADRS%2F2026_05_11_15_42_%5BSTARTER_DOC%5D_bilingual_starter_doc_and_interactive_npx_initializer",
    "title": "Bilingual Starter Doc And Interactive Npx Initializer",
    "category": "STARTER_DOC",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_11_15_42_%255BSTARTER_DOC%255D_bilingual_starter_doc_and_interactive_npx_initializer"
  },
  {
    "id": "ADRS%2F2026_05_11_15_43_%5BDIAGRAM%5D_edge_arrow_direction_adds_from_value_alongside_to_both_and_none",
    "title": "Edge Arrow Direction Adds From Value Alongside To Both And None",
    "category": "DIAGRAM",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_11_15_43_%255BDIAGRAM%255D_edge_arrow_direction_adds_from_value_alongside_to_both_and_none"
  },
  {
    "id": "ADRS%2F2026_05_11_15_44_%5BDIAGRAM%5D_edge_lock_button_toggles_unlock_in_addition_to_lock",
    "title": "Edge Lock Button Toggles Unlock In Addition To Lock",
    "category": "DIAGRAM",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_11_15_44_%255BDIAGRAM%255D_edge_lock_button_toggles_unlock_in_addition_to_lock"
  },
  {
    "id": "ADRS%2F2026_05_11_15_44_%5BDIAGRAM%5D_font_size_readout_on_the_node_property_bar",
    "title": "Font Size Readout On The Node Property Bar",
    "category": "DIAGRAM",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_11_15_44_%255BDIAGRAM%255D_font_size_readout_on_the_node_property_bar"
  },
  {
    "id": "ADRS%2F2026_05_11_16_08_%5BAI_CONTEXT%5D_mcp_explorer_saves_run_results_as_markdown_documents_in_ai_mcp_folder",
    "title": "Mcp Explorer Saves Run Results As Markdown Documents In Ai Mcp Folder",
    "category": "AI_CONTEXT",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_11_16_08_%255BAI_CONTEXT%255D_mcp_explorer_saves_run_results_as_markdown_documents_in_ai_mcp_folder"
  },
  {
    "id": "ADRS%2F2026_05_11_19_33_%5BAI_CONTEXT%5D_affichage_detail_erreur_appels_mcp_page_context",
    "title": "Affichage Detail Erreur Appels Mcp Page Context",
    "category": "AI_CONTEXT",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_11_19_33_%255BAI_CONTEXT%255D_affichage_detail_erreur_appels_mcp_page_context"
  },
  {
    "id": "ADRS%2F2026_05_11_19_41_%5BFRONTEND%5D_copie_id_document_mcp_depuis_entete_viewer",
    "title": "Copie Id Document Mcp Depuis Entete Viewer",
    "category": "FRONTEND",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_11_19_41_%255BFRONTEND%255D_copie_id_document_mcp_depuis_entete_viewer"
  },
  {
    "id": "ADRS%2F2026_05_11_20_03_%5BDIAGRAM%5D_copie_id_diagramme_mcp_depuis_topbar_editeur",
    "title": "Copie Id Diagramme Mcp Depuis Topbar Editeur",
    "category": "DIAGRAM",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_11_20_03_%255BDIAGRAM%255D_copie_id_diagramme_mcp_depuis_topbar_editeur"
  },
  {
    "id": "ADRS%2F2026_05_11_22_33_%5BMCP%5D_review_adr_relevance_mcp_tool",
    "title": "Review Adr Relevance Mcp Tool",
    "category": "MCP",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_11_22_33_%255BMCP%255D_review_adr_relevance_mcp_tool"
  },
  {
    "id": "ADRS%2F2026_05_12_00_58_%5BMCP%5D_retrodocument_adrs_from_git_mcp_tool_and_prompt",
    "title": "Retrodocument Adrs From Git Mcp Tool And Prompt",
    "category": "MCP",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_12_00_58_%255BMCP%255D_retrodocument_adrs_from_git_mcp_tool_and_prompt"
  },
  {
    "id": "ADRS%2F2026_05_12_11_06_%5BPACKAGING%5D_vendor_tailwind_play_cdn_and_font_awesome_locally_for_offline_and_proxy_resilience",
    "title": "Vendor Tailwind Play Cdn And Font Awesome Locally For Offline And Proxy Resilience",
    "category": "PACKAGING",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_12_11_06_%255BPACKAGING%255D_vendor_tailwind_play_cdn_and_font_awesome_locally_for_offline_and_proxy_resilience"
  },
  {
    "id": "ADRS%2F2026_05_12_11_46_%5BDIAGRAM%5D_export_diagrammes_au_format_drawio_mxgraph_xml",
    "title": "Export Diagrammes Au Format Drawio Mxgraph Xml",
    "category": "DIAGRAM",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_12_11_46_%255BDIAGRAM%255D_export_diagrammes_au_format_drawio_mxgraph_xml"
  },
  {
    "id": "ADRS%2F2026_05_13_19_03_%5BPACKAGING%5D_revert_vendoring_tailwind_and_font_awesome_proxy_access_restored",
    "title": "Revert Vendoring Tailwind And Font Awesome Proxy Access Restored",
    "category": "PACKAGING",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_13_19_03_%255BPACKAGING%255D_revert_vendoring_tailwind_and_font_awesome_proxy_access_restored"
  },
  {
    "id": "ADRS%2F2026_05_14_11_33_%5BSTARTER_DOC%5D_worklog_convention_for_ai_handoff_in_bilingual_starter",
    "title": "Worklog Convention For Ai Handoff In Bilingual Starter",
    "category": "STARTER_DOC",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_14_11_33_%255BSTARTER_DOC%255D_worklog_convention_for_ai_handoff_in_bilingual_starter"
  },
  {
    "id": "ADRS%2F2026_05_14_12_07_%5BFRONTEND%5D_validate_button_on_viewer_for_frontmatter_status_flip",
    "title": "Validate Button On Viewer For Frontmatter Status Flip",
    "category": "FRONTEND",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_14_12_07_%255BFRONTEND%255D_validate_button_on_viewer_for_frontmatter_status_flip"
  },
  {
    "id": "ADRS%2F2026_05_14_12_29_%5BMETADATA%5D_read_only_metadata_for_superseeded_documents",
    "title": "Read Only Metadata For Superseeded Documents",
    "category": "METADATA",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_14_12_29_%255BMETADATA%255D_read_only_metadata_for_superseeded_documents"
  },
  {
    "id": "ADRS%2F2026_05_14_13_01_%5BCI%5D_gate_npm_publish_on_tests_codeql_and_readme_sync",
    "title": "Gate Npm Publish On Tests Codeql And Readme Sync",
    "category": "CI",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_14_13_01_%255BCI%255D_gate_npm_publish_on_tests_codeql_and_readme_sync"
  },
  {
    "id": "ADRS%2F2026_05_17_19_11_%5BSNIPPET%5D_edition_inline_des_snippets_depuis_le_viewer_par_clic_droit",
    "title": "Edition Inline Des Snippets Depuis Le Viewer Par Clic Droit",
    "category": "SNIPPET",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_17_19_11_%255BSNIPPET%255D_edition_inline_des_snippets_depuis_le_viewer_par_clic_droit"
  },
  {
    "id": "ADRS%2F2026_05_23_10_07_%5BFRONTEND_QUALITY%5D_controle_syntaxique_frontend_sans_dependance",
    "title": "Controle Syntaxique Frontend Sans Dependance",
    "category": "FRONTEND_QUALITY",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_23_10_07_%255BFRONTEND_QUALITY%255D_controle_syntaxique_frontend_sans_dependance"
  },
  {
    "id": "ADRS%2F2026_05_23_10_40_%5BFRONTEND%5D_feature_folders_frontend_pour_snippets_et_modales",
    "title": "Feature Folders Frontend Pour Snippets Et Modales",
    "category": "FRONTEND",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_23_10_40_%255BFRONTEND%255D_feature_folders_frontend_pour_snippets_et_modales"
  },
  {
    "id": "ADRS%2F2026_05_29_14_45_%5BSIDEBAR%5D_sidebar_status_highlight_tristate_pills_for_to_be_validated_and_superseeded",
    "title": "Sidebar Status Highlight Tristate Pills For To Be Validated And Superseeded",
    "category": "SIDEBAR",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_29_14_45_%255BSIDEBAR%255D_sidebar_status_highlight_tristate_pills_for_to_be_validated_and_superseeded"
  },
  {
    "id": "ADRS%2F2026_05_29_21_56_%5BFRONTEND_EXPERIMENT%5D_prototype_isole_html_in_canvas_pour_configuration_graphe",
    "title": "Prototype Isole Html In Canvas Pour Configuration Graphe",
    "category": "FRONTEND_EXPERIMENT",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_29_21_56_%255BFRONTEND_EXPERIMENT%255D_prototype_isole_html_in_canvas_pour_configuration_graphe"
  },
  {
    "id": "ADRS%2F2026_05_30_22_14_%5BFRONTEND%5D_workspace_configuration_graph_avec_agents_llm_et_tool_use_mcp",
    "title": "Workspace Configuration Graph Avec Agents Llm Et Tool Use Mcp",
    "category": "FRONTEND",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_30_22_14_%255BFRONTEND%255D_workspace_configuration_graph_avec_agents_llm_et_tool_use_mcp"
  },
  {
    "id": "ADRS%2F2026_05_31_11_43_%5BADR%5D_diagram_defaults_valeurs_par_defaut_de_creation_persistees_dans_livingdocjson",
    "title": "Diagram Defaults Valeurs Par Defaut De Creation Persistees Dans Livingdocjson",
    "category": "ADR",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_31_11_43_%255BADR%255D_diagram_defaults_valeurs_par_defaut_de_creation_persistees_dans_livingdocjson"
  },
  {
    "id": "ADRS%2F2026_05_31_11_44_%5BADR%5D_color_picker_partage_remplacement_de_la_palette_inline_par_un_swatch_popup_rectangulaire",
    "title": "Color Picker Partage Remplacement De La Palette Inline Par Un Swatch Popup Rectangulaire",
    "category": "ADR",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_31_11_44_%255BADR%255D_color_picker_partage_remplacement_de_la_palette_inline_par_un_swatch_popup_rectangulaire"
  },
  {
    "id": "ADRS%2F2026_05_31_15_34_%5BADR%5D_persistance_et_application_des_styles_de_fleches_tous_types_daretes_et_defaults_a_la_creation",
    "title": "Persistance Et Application Des Styles De Fleches Tous Types Daretes Et Defaults A La Creation",
    "category": "ADR",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_31_15_34_%255BADR%255D_persistance_et_application_des_styles_de_fleches_tous_types_daretes_et_defaults_a_la_creation"
  },
  {
    "id": "ADRS%2F2026_05_31_15_34_%5BADR%5D_synchronisation_localstorage_et_diagramdefaults_coherence_des_styles_de_creation",
    "title": "Synchronisation Localstorage Et Diagramdefaults Coherence Des Styles De Creation",
    "category": "ADR",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_31_15_34_%255BADR%255D_synchronisation_localstorage_et_diagramdefaults_coherence_des_styles_de_creation"
  },
  {
    "id": "ADRS%2F2026_05_31_15_35_%5BADR%5D_diagramdefaults_dans_storage_defaults_valeurs_embarquees_dans_le_template_projet",
    "title": "Diagramdefaults Dans Storage Defaults Valeurs Embarquees Dans Le Template Projet",
    "category": "ADR",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_05_31_15_35_%255BADR%255D_diagramdefaults_dans_storage_defaults_valeurs_embarquees_dans_le_template_projet"
  },
  {
    "id": "ADRS%2F2026_06_01_14_19_%5BFRONTEND%5D_blueprint_explorateur_de_dossiers_source_avec_canvas_prezi",
    "title": "Blueprint Explorateur De Dossiers Source Avec Canvas Prezi",
    "category": "FRONTEND",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_06_01_14_19_%255BFRONTEND%255D_blueprint_explorateur_de_dossiers_source_avec_canvas_prezi"
  },
  {
    "id": "ADRS%2F2026_06_03_10_53_%5BFRONTEND%5D_migration_du_frontend_vers_une_application_svelte_unifiee",
    "title": "Migration Du Frontend Vers Une Application Svelte Unifiee",
    "category": "FRONTEND",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_06_03_10_53_%255BFRONTEND%255D_migration_du_frontend_vers_une_application_svelte_unifiee"
  },
  {
    "id": "ADRS%2F2026_06_06_16_17_%5BANNOTATION%5D_annotation_popup_fixes_details_autoopen_scroll_hide_hover_delay",
    "title": "Annotation Popup Fixes Details Autoopen Scroll Hide Hover Delay",
    "category": "ANNOTATION",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_06_06_16_17_%255BANNOTATION%255D_annotation_popup_fixes_details_autoopen_scroll_hide_hover_delay"
  },
  {
    "id": "ADRS%2F2026_06_06_16_17_%5BFRONTEND%5D_table_of_contents_panel_with_resizable_sidebar",
    "title": "Table Of Contents Panel With Resizable Sidebar",
    "category": "FRONTEND",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_06_06_16_17_%255BFRONTEND%255D_table_of_contents_panel_with_resizable_sidebar"
  },
  {
    "id": "ADRS%2F2026_06_06_16_17_%5BSEARCH%5D_accentinsensitive_search_across_global_api_and_indocument_highlight",
    "title": "Accentinsensitive Search Across Global Api And Indocument Highlight",
    "category": "SEARCH",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_06_06_16_17_%255BSEARCH%255D_accentinsensitive_search_across_global_api_and_indocument_highlight"
  },
  {
    "id": "ADRS%2F2026_06_06_21_47_%5BSNIPPET%5D_spreadsheet_style_table_snippet_editor",
    "title": "Spreadsheet Style Table Snippet Editor",
    "category": "SNIPPET",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_06_06_21_47_%255BSNIPPET%255D_spreadsheet_style_table_snippet_editor"
  },
  {
    "id": "ADRS%2F2026_06_06_22_32_%5BSTYLE%5D_images_and_codeblock_style_and_alignment",
    "title": "Images And Codeblock Style And Alignment",
    "category": "STYLE",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_06_06_22_32_%255BSTYLE%255D_images_and_codeblock_style_and_alignment"
  },
  {
    "id": "ADRS%2F2026_06_07_12_23_%5BFRONTEND%5D_callout_boxes_via_html_comment_prefix_on_blockquotes",
    "title": "Callout Boxes Via Html Comment Prefix On Blockquotes",
    "category": "FRONTEND",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_06_07_12_23_%255BFRONTEND%255D_callout_boxes_via_html_comment_prefix_on_blockquotes"
  },
  {
    "id": "ADRS%2F2026_06_18_22_27_%5BRUNTIME%5D_runtime_minimal_node_20_19_pour_vite_8",
    "title": "Runtime Minimal Node 20 19 Pour Vite 8",
    "category": "RUNTIME",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_06_18_22_27_%255BRUNTIME%255D_runtime_minimal_node_20_19_pour_vite_8"
  },
  {
    "id": "ADRS%2F2026_06_18_22_27_%5BSURVIVAL%20KIT%5D_survival_kit_dashboard_local_persiste",
    "title": "Survival Kit Dashboard Local Persiste",
    "category": "SURVIVAL KIT",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_06_18_22_27_%255BSURVIVAL%2520KIT%255D_survival_kit_dashboard_local_persiste"
  },
  {
    "id": "ADRS%2F2026_06_18_22_37_%5BIMAGE%5D_directives_de_largeur_et_alignement_des_images_markdown",
    "title": "Directives De Largeur Et Alignement Des Images Markdown",
    "category": "IMAGE",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_06_18_22_37_%255BIMAGE%255D_directives_de_largeur_et_alignement_des_images_markdown"
  },
  {
    "id": "ADRS%2F2026_06_18_23_07_%5BMERMAID%5D_shift_click_fullscreen_pour_les_diagrammes_mermaid",
    "title": "Shift Click Fullscreen Pour Les Diagrammes Mermaid",
    "category": "MERMAID",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_06_18_23_07_%255BMERMAID%255D_shift_click_fullscreen_pour_les_diagrammes_mermaid"
  },
  {
    "id": "ADRS%2F2026_06_18_23_24_%5BCODE%20BLOCK%5D_directives_de_largeur_et_alignement_des_blocs_code_et_mermaid",
    "title": "Directives De Largeur Et Alignement Des Blocs Code Et Mermaid",
    "category": "CODE BLOCK",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_06_18_23_24_%255BCODE%2520BLOCK%255D_directives_de_largeur_et_alignement_des_blocs_code_et_mermaid"
  },
  {
    "id": "ADRS%2F2026_06_23_22_21_%5BADR%5D_commit_and_dirty_flag_stored_with_each_metadata_hash",
    "title": "Commit And Dirty Flag Stored With Each Metadata Hash",
    "category": "ADR",
    "folder": "ADRS",
    "linkHref": "?doc=ADRS%252F2026_06_23_22_21_%255BADR%255D_commit_and_dirty_flag_stored_with_each_metadata_hash"
  },
  {
    "id": "AI%2F2026_01_01_how_to",
    "title": "How To",
    "category": "General",
    "folder": "AI",
    "linkHref": "?doc=AI%252F2026_01_01_how_to"
  },
  {
    "id": "AI%2FAGENTS",
    "title": "AGENTS",
    "category": "General",
    "folder": "AI",
    "linkHref": "?doc=AI%252FAGENTS"
  },
  {
    "id": "AI%2FCLAUDE",
    "title": "CLAUDE",
    "category": "General",
    "folder": "AI",
    "linkHref": "?doc=AI%252FCLAUDE"
  },
  {
    "id": "AI%2FMCP%2F001-tool-list-adrs-below-accuracy",
    "title": "001 tool list adrs below accuracy",
    "category": "General",
    "folder": "AI/MCP",
    "linkHref": "?doc=AI%252FMCP%252F001-tool-list-adrs-below-accuracy"
  },
  {
    "id": "AI%2FMCP%2F002-prompt-audit-adrs-drift",
    "title": "002 prompt audit adrs drift",
    "category": "General",
    "folder": "AI/MCP",
    "linkHref": "?doc=AI%252FMCP%252F002-prompt-audit-adrs-drift"
  },
  {
    "id": "AI%2FMCP%2F003-prompt-erd",
    "title": "003 prompt erd",
    "category": "General",
    "folder": "AI/MCP",
    "linkHref": "?doc=AI%252FMCP%252F003-prompt-erd"
  },
  {
    "id": "AI%2FMCP%2F004-prompt-review-adr-relevance",
    "title": "004 prompt review adr relevance",
    "category": "General",
    "folder": "AI/MCP",
    "linkHref": "?doc=AI%252FMCP%252F004-prompt-review-adr-relevance"
  },
  {
    "id": "AI%2FMCP%2F005-tool-review-adr-relevance",
    "title": "005 tool review adr relevance",
    "category": "General",
    "folder": "AI/MCP",
    "linkHref": "?doc=AI%252FMCP%252F005-tool-review-adr-relevance"
  },
  {
    "id": "AI%2FMCP%2F006-prompt-retrodocument-adrs-from-git",
    "title": "006 prompt retrodocument adrs from git",
    "category": "General",
    "folder": "AI/MCP",
    "linkHref": "?doc=AI%252FMCP%252F006-prompt-retrodocument-adrs-from-git"
  },
  {
    "id": "AI%2FMCP%2F007-tool-retrodocument-adrs-from-git",
    "title": "007 tool retrodocument adrs from git",
    "category": "General",
    "folder": "AI/MCP",
    "linkHref": "?doc=AI%252FMCP%252F007-tool-retrodocument-adrs-from-git"
  },
  {
    "id": "AI%2FMCP%2F008-prompt-generate-container-diagram",
    "title": "008 prompt generate container diagram",
    "category": "General",
    "folder": "AI/MCP",
    "linkHref": "?doc=AI%252FMCP%252F008-prompt-generate-container-diagram"
  },
  {
    "id": "AI%2FMEMORY",
    "title": "MEMORY",
    "category": "General",
    "folder": "AI",
    "linkHref": "?doc=AI%252FMEMORY"
  },
  {
    "id": "AI%2FPROJECT-INSTRUCTIONS",
    "title": "PROJECT INSTRUCTIONS",
    "category": "General",
    "folder": "AI",
    "linkHref": "?doc=AI%252FPROJECT-INSTRUCTIONS"
  },
  {
    "id": "AI%2FPROJECT-STACK",
    "title": "PROJECT STACK",
    "category": "General",
    "folder": "AI",
    "linkHref": "?doc=AI%252FPROJECT-STACK"
  },
  {
    "id": "AI%2FPROJECT-USEFUL-COMMANDS",
    "title": "PROJECT USEFUL COMMANDS",
    "category": "General",
    "folder": "AI",
    "linkHref": "?doc=AI%252FPROJECT-USEFUL-COMMANDS"
  },
  {
    "id": "AI%2FWORKSPACE%2Fagent_de_listage_des_adrs_driftes%2F2026_06_02_17_13_%5BAGENT%5D_run_agent_de_listage_des_adrs_driftes",
    "title": "Run Agent De Listage Des Adrs Driftes",
    "category": "AGENT",
    "folder": "AI/WORKSPACE/agent_de_listage_des_adrs_driftes",
    "linkHref": "?doc=AI%252FWORKSPACE%252Fagent_de_listage_des_adrs_driftes%252F2026_06_02_17_13_%255BAGENT%255D_run_agent_de_listage_des_adrs_driftes"
  },
  {
    "id": "AI%2FWORKSPACE%2Fagent_de_listage_des_adrs_driftes%2F2026_06_02_17_15_%5BAGENT%5D_run_agent_de_listage_des_adrs_driftes",
    "title": "Run Agent De Listage Des Adrs Driftes",
    "category": "AGENT",
    "folder": "AI/WORKSPACE/agent_de_listage_des_adrs_driftes",
    "linkHref": "?doc=AI%252FWORKSPACE%252Fagent_de_listage_des_adrs_driftes%252F2026_06_02_17_15_%255BAGENT%255D_run_agent_de_listage_des_adrs_driftes"
  },
  {
    "id": "AI%2FWORKSPACE%2Fcalculate_mathematical_operation%2F2026_06_25_20_48_%5BAGENT%5D_run_agent_2",
    "title": "Run Agent 2",
    "category": "AGENT",
    "folder": "AI/WORKSPACE/calculate_mathematical_operation",
    "linkHref": "?doc=AI%252FWORKSPACE%252Fcalculate_mathematical_operation%252F2026_06_25_20_48_%255BAGENT%255D_run_agent_2"
  },
  {
    "id": "AI%2FWORKSPACE%2Fcalculate_mathematical_operation%2F2026_06_25_21_20_%5BAGENT%5D_run_agent_2",
    "title": "Run Agent 2",
    "category": "AGENT",
    "folder": "AI/WORKSPACE/calculate_mathematical_operation",
    "linkHref": "?doc=AI%252FWORKSPACE%252Fcalculate_mathematical_operation%252F2026_06_25_21_20_%255BAGENT%255D_run_agent_2"
  },
  {
    "id": "AI%2FWORKSPACE%2Fgenerer_diagramme_mermaid%2F2026_06_02_17_14_%5BAGENT%5D_run_generer_diagramme_mermaid",
    "title": "Run Generer Diagramme Mermaid",
    "category": "AGENT",
    "folder": "AI/WORKSPACE/generer_diagramme_mermaid",
    "linkHref": "?doc=AI%252FWORKSPACE%252Fgenerer_diagramme_mermaid%252F2026_06_02_17_14_%255BAGENT%255D_run_generer_diagramme_mermaid"
  },
  {
    "id": "AI%2FWORKSPACE%2Fgenerer_diagramme_mermaid%2F2026_06_02_17_14_%5BAGENT%5D_run_generer_diagramme_mermaid_2",
    "title": "Run Generer Diagramme Mermaid 2",
    "category": "AGENT",
    "folder": "AI/WORKSPACE/generer_diagramme_mermaid",
    "linkHref": "?doc=AI%252FWORKSPACE%252Fgenerer_diagramme_mermaid%252F2026_06_02_17_14_%255BAGENT%255D_run_generer_diagramme_mermaid_2"
  },
  {
    "id": "AI%2FWORKSPACE%2Ftraducteur_anglais_vers_francais%2F2026_06_25_20_31_%5BAGENT%5D_run_traducteur_anglais_vers_francais",
    "title": "Run Traducteur Anglais Vers Francais",
    "category": "AGENT",
    "folder": "AI/WORKSPACE/traducteur_anglais_vers_francais",
    "linkHref": "?doc=AI%252FWORKSPACE%252Ftraducteur_anglais_vers_francais%252F2026_06_25_20_31_%255BAGENT%255D_run_traducteur_anglais_vers_francais"
  },
  {
    "id": "AI%2FWORKSPACE%2Ftraducteur_anglais_vers_francais%2F2026_06_25_20_46_%5BAGENT%5D_run_traducteur_anglais_vers_francais",
    "title": "Run Traducteur Anglais Vers Francais",
    "category": "AGENT",
    "folder": "AI/WORKSPACE/traducteur_anglais_vers_francais",
    "linkHref": "?doc=AI%252FWORKSPACE%252Ftraducteur_anglais_vers_francais%252F2026_06_25_20_46_%255BAGENT%255D_run_traducteur_anglais_vers_francais"
  },
  {
    "id": "AI%2Frules%2Fdiagram-vis-network-gotchas",
    "title": "Diagram vis network gotchas",
    "category": "General",
    "folder": "AI/rules",
    "linkHref": "?doc=AI%252Frules%252Fdiagram-vis-network-gotchas"
  },
  {
    "id": "AI%2Frules%2Fi18n-user-visible-strings",
    "title": "I18n user visible strings",
    "category": "General",
    "folder": "AI/rules",
    "linkHref": "?doc=AI%252Frules%252Fi18n-user-visible-strings"
  },
  {
    "id": "AI%2Frules%2Fno-magic-numbers",
    "title": "No magic numbers",
    "category": "General",
    "folder": "AI/rules",
    "linkHref": "?doc=AI%252Frules%252Fno-magic-numbers"
  },
  {
    "id": "AI%2Frules%2Fplaywright-coverage-through-cli",
    "title": "Playwright coverage through cli",
    "category": "General",
    "folder": "AI/rules",
    "linkHref": "?doc=AI%252Frules%252Fplaywright-coverage-through-cli"
  },
  {
    "id": "AI%2Frules%2Ftrack-current-work",
    "title": "Track current work",
    "category": "General",
    "folder": "AI/rules",
    "linkHref": "?doc=AI%252Frules%252Ftrack-current-work"
  },
  {
    "id": "WORKLOG%2Fcurrent-task",
    "title": "Current task",
    "category": "General",
    "folder": "WORKLOG",
    "linkHref": "?doc=WORKLOG%252Fcurrent-task"
  }
]
```
