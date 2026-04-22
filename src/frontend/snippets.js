// ── Snippets modal: type switching, preview, insert, parse ──────────────────
// Depends on globals from state.js (allDocs, currentDocId, currentDocContent),
// utils.js (esc), snippet-detect.js (detectSnippetType), snippet-table.js
// (_tableData, tableInit, tableRenderGrid, buildTableMarkdown) and
// snippet-tree.js (_treeItems, treeInit, treeRenderList, buildTreeMarkdown).

let _snippetSelStart = 0;
let _snippetSelEnd = 0;
const _SNIPPET_PANELS = [
  "collapsible",
  "link",
  "doc-link",
  "anchor-link",
  "anchor-doc-link",
  "code-block",
  "image",
  "table",
  "tree",
  "diagram",
  "colored-section",
  "colored-text",
  "emojis",
  "attachment",
];

// Each emoji has search tags (bilingual FR/EN, space-separated, lowercase).
// Filter matches a 2+ char query against any tag prefix or substring.
const _EMOJI_CATEGORIES = [
  { label: 'snippet.emoji_cat_smileys', emojis: [
    { e: '😀', t: 'grin grinning smile sourire happy heureux' },
    { e: '😃', t: 'smiley joy joie sourire happy' },
    { e: '😄', t: 'smile sourire happy heureux joie' },
    { e: '😁', t: 'beaming grin sourire dents' },
    { e: '😆', t: 'laugh rire lol' },
    { e: '😅', t: 'sweat transpire rire nerveux' },
    { e: '🤣', t: 'rofl lol mdr rire' },
    { e: '😂', t: 'joy larmes tears rire lol' },
    { e: '🙂', t: 'slight smile sourire' },
    { e: '🙃', t: 'upside renverse inverse' },
    { e: '😉', t: 'wink clin oeil' },
    { e: '😊', t: 'blush rougir sourire' },
    { e: '😇', t: 'angel ange halo innocent' },
    { e: '🥰', t: 'love amour coeur heart smile' },
    { e: '😍', t: 'heart eyes amoureux love amour' },
    { e: '🤩', t: 'star stars etoile wow' },
    { e: '😘', t: 'kiss bisou' },
    { e: '😋', t: 'yum miam savoureux langue' },
    { e: '😛', t: 'tongue langue' },
    { e: '😜', t: 'wink tongue langue clin' },
    { e: '🤪', t: 'crazy fou zany' },
    { e: '😝', t: 'tongue langue squinting' },
    { e: '🤗', t: 'hug calin embrasser' },
    { e: '🤔', t: 'think reflexion reflechir pense' },
    { e: '🤨', t: 'raised brow sourcil suspicious' },
    { e: '😐', t: 'neutral neutre' },
    { e: '😑', t: 'expressionless impassible' },
    { e: '😒', t: 'unamused decu blase' },
    { e: '🙄', t: 'roll eyes yeux ciel' },
    { e: '😬', t: 'grimace' },
    { e: '😌', t: 'relieved soulage' },
    { e: '😔', t: 'pensive pensif triste sad' },
    { e: '😪', t: 'sleepy sommeil fatigue' },
    { e: '😴', t: 'sleep dormir zzz' },
    { e: '🤤', t: 'drool bave' },
    { e: '😷', t: 'mask masque malade' },
    { e: '🤒', t: 'sick malade fever fievre' },
    { e: '🤕', t: 'hurt blesse bandage' },
    { e: '🤢', t: 'nausea nausee' },
    { e: '🤮', t: 'vomit vomir malade' },
    { e: '🤧', t: 'sneeze eternue rhume' },
    { e: '🥵', t: 'hot chaud transpire' },
    { e: '🥶', t: 'cold froid gele' },
    { e: '🥴', t: 'woozy ivre' },
    { e: '😵', t: 'dizzy dead mort vertige' },
    { e: '🤯', t: 'explode tete mind blown' },
    { e: '🤠', t: 'cowboy chapeau' },
    { e: '🥳', t: 'party fete anniversaire birthday' },
    { e: '😎', t: 'cool sunglasses lunettes' },
    { e: '🤓', t: 'nerd geek' },
    { e: '🧐', t: 'monocle curious' },
    { e: '😕', t: 'confused confus' },
    { e: '😟', t: 'worried inquiet' },
    { e: '🙁', t: 'frown triste' },
    { e: '☹️', t: 'sad triste frown' },
    { e: '😮', t: 'surprised surpris open mouth' },
    { e: '😯', t: 'hushed' },
    { e: '😲', t: 'astonished etonne' },
    { e: '😳', t: 'flushed gene rougeur' },
    { e: '🥺', t: 'pleading supplier chien' },
    { e: '😦', t: 'frown open mouth' },
    { e: '😧', t: 'anguish angoisse' },
    { e: '😨', t: 'fear peur' },
    { e: '😰', t: 'anxious anxieux stress' },
    { e: '😥', t: 'sad disappointed decu' },
    { e: '😢', t: 'cry pleurer larme' },
    { e: '😭', t: 'cry pleurer loud bawling' },
    { e: '😱', t: 'scream cri peur horror' },
    { e: '😖', t: 'confounded' },
    { e: '😣', t: 'persevere effort' },
    { e: '😞', t: 'disappointed decu' },
    { e: '😓', t: 'sweat transpire fatigue' },
    { e: '😩', t: 'weary fatigue las' },
    { e: '😫', t: 'tired fatigue' },
    { e: '🥱', t: 'yawn baille' },
    { e: '😤', t: 'triumph huff vapeur nez' },
    { e: '😠', t: 'angry colere fache' },
    { e: '😡', t: 'rage colere rouge' },
    { e: '🤬', t: 'curse insulte jure' },
    { e: '😈', t: 'devil diable smiling' },
    { e: '👿', t: 'imp diable' },
    { e: '💀', t: 'skull mort death crane' },
    { e: '☠️', t: 'crossbones pirate mort death' },
    { e: '💩', t: 'poop caca merde' },
    { e: '🤡', t: 'clown' },
    { e: '👻', t: 'ghost fantome' },
    { e: '👽', t: 'alien extraterrestre' },
    { e: '🤖', t: 'robot ia ai' },
    { e: '🎃', t: 'pumpkin halloween citrouille' },
    { e: '😺', t: 'cat chat' },
    { e: '😸', t: 'cat chat grin' },
    { e: '😹', t: 'cat chat joy' },
    { e: '😻', t: 'cat chat love amour heart' },
    { e: '😼', t: 'cat chat wry' },
    { e: '😽', t: 'cat chat kiss' },
    { e: '🙀', t: 'cat chat fear peur' },
    { e: '😿', t: 'cat chat cry pleurer' },
    { e: '😾', t: 'cat chat angry colere' },
  ]},
  { label: 'snippet.emoji_cat_gestures', emojis: [
    { e: '👍', t: 'thumbs up pouce ok bien like' },
    { e: '👎', t: 'thumbs down pouce bas dislike' },
    { e: '👌', t: 'ok parfait' },
    { e: '✌️', t: 'victory victoire peace paix' },
    { e: '🤞', t: 'fingers crossed doigts croises' },
    { e: '🤟', t: 'love you' },
    { e: '🤘', t: 'rock horns metal cornes' },
    { e: '🤙', t: 'call appelle hang loose' },
    { e: '👈', t: 'left gauche pointing' },
    { e: '👉', t: 'right droite pointing' },
    { e: '👆', t: 'up haut pointing' },
    { e: '👇', t: 'down bas pointing' },
    { e: '☝️', t: 'one index up haut' },
    { e: '✋', t: 'stop hand main raised' },
    { e: '🤚', t: 'back hand main' },
    { e: '🖐️', t: 'hand main splayed' },
    { e: '🖖', t: 'vulcan spock star trek' },
    { e: '👋', t: 'wave bonjour hello salut goodbye' },
    { e: '🤝', t: 'handshake accord deal poignee' },
    { e: '🙏', t: 'pray priere merci thanks please' },
    { e: '💪', t: 'muscle fort biceps strong' },
    { e: '🦾', t: 'mechanical arm bras prothese' },
    { e: '👏', t: 'clap applaud bravo applaudir' },
    { e: '🙌', t: 'raise hands hourra celebrate' },
    { e: '👐', t: 'open hands' },
    { e: '🤲', t: 'palms up paumes' },
    { e: '🤜', t: 'fist poing right' },
    { e: '🤛', t: 'fist poing left' },
    { e: '✊', t: 'fist poing leve' },
    { e: '👊', t: 'fist punch poing frapper' },
    { e: '🤏', t: 'pinch petit small' },
    { e: '🤌', t: 'italian pinched' },
    { e: '🖕', t: 'middle finger doigt honneur' },
    { e: '✍️', t: 'write ecrire hand main' },
    { e: '🦶', t: 'foot pied' },
    { e: '🦵', t: 'leg jambe' },
    { e: '👂', t: 'ear oreille' },
    { e: '🦻', t: 'ear hearing appareil auditif' },
    { e: '👃', t: 'nose nez' },
    { e: '🧠', t: 'brain cerveau mind' },
    { e: '👀', t: 'eyes yeux regarder' },
    { e: '👁️', t: 'eye oeil' },
    { e: '👄', t: 'mouth bouche' },
    { e: '👅', t: 'tongue langue' },
    { e: '🦷', t: 'tooth dent' },
    { e: '🫀', t: 'heart anatomic coeur organe' },
    { e: '🫁', t: 'lungs poumons' },
  ]},
  { label: 'snippet.emoji_cat_hearts', emojis: [
    { e: '❤️', t: 'heart coeur red rouge love amour' },
    { e: '🧡', t: 'orange heart coeur' },
    { e: '💛', t: 'yellow heart coeur jaune' },
    { e: '💚', t: 'green heart coeur vert' },
    { e: '💙', t: 'blue heart coeur bleu' },
    { e: '💜', t: 'purple heart coeur violet' },
    { e: '🖤', t: 'black heart coeur noir' },
    { e: '🤍', t: 'white heart coeur blanc' },
    { e: '🤎', t: 'brown heart coeur marron' },
    { e: '💔', t: 'broken heart coeur brise rupture' },
    { e: '❤️‍🔥', t: 'heart fire feu passion' },
    { e: '❤️‍🩹', t: 'heart mending coeur reparation' },
    { e: '💖', t: 'sparkling heart coeur brillant' },
    { e: '💕', t: 'two hearts coeurs' },
    { e: '💘', t: 'arrow heart cupid cupidon' },
    { e: '💝', t: 'ribbon heart cadeau' },
    { e: '💞', t: 'revolving hearts coeurs' },
    { e: '💟', t: 'heart decoration' },
    { e: '💌', t: 'love letter lettre enveloppe' },
    { e: '💋', t: 'kiss mark bisou levres' },
    { e: '❣️', t: 'heart exclamation' },
    { e: '💯', t: 'hundred 100 cent perfect parfait' },
    { e: '✨', t: 'sparkles etincelles magic magique brillant' },
    { e: '⭐', t: 'star etoile' },
    { e: '🌟', t: 'glowing star etoile' },
    { e: '💫', t: 'dizzy star vertige etoile' },
    { e: '🔥', t: 'fire feu hot flamme' },
    { e: '💥', t: 'boom explosion collision' },
    { e: '⚡', t: 'lightning eclair thunder tonnerre fast' },
    { e: '💢', t: 'anger colere symbol' },
    { e: '💨', t: 'dash vent wind fast vitesse' },
    { e: '💦', t: 'drops gouttes sweat eau' },
    { e: '💤', t: 'zzz sleep dormir sommeil' },
    { e: '🕳️', t: 'hole trou' },
    { e: '💭', t: 'thought pensee bulle' },
    { e: '🗯️', t: 'right anger bubble' },
    { e: '💬', t: 'speech bulle dialogue chat' },
  ]},
  { label: 'snippet.emoji_cat_objects', emojis: [
    { e: '💻', t: 'laptop ordinateur computer portable' },
    { e: '🖥️', t: 'desktop computer ordinateur bureau' },
    { e: '⌨️', t: 'keyboard clavier' },
    { e: '🖱️', t: 'mouse souris' },
    { e: '💾', t: 'floppy disquette save sauvegarder' },
    { e: '💿', t: 'disk cd optical' },
    { e: '📀', t: 'dvd' },
    { e: '📱', t: 'phone mobile telephone smartphone' },
    { e: '📲', t: 'phone call mobile incoming' },
    { e: '☎️', t: 'telephone vintage' },
    { e: '📞', t: 'receiver combine phone' },
    { e: '📟', t: 'pager' },
    { e: '📠', t: 'fax' },
    { e: '🔋', t: 'battery batterie pile' },
    { e: '🔌', t: 'plug prise electrique' },
    { e: '💡', t: 'bulb idee idea light lumiere ampoule' },
    { e: '🔦', t: 'flashlight torche lampe' },
    { e: '🕯️', t: 'candle bougie' },
    { e: '📷', t: 'camera appareil photo' },
    { e: '📸', t: 'camera flash photo' },
    { e: '📹', t: 'video camera' },
    { e: '🎥', t: 'movie film cinema camera' },
    { e: '🎞️', t: 'film reel pellicule' },
    { e: '📽️', t: 'projector projecteur' },
    { e: '⏰', t: 'alarm reveil clock horloge' },
    { e: '⏱️', t: 'stopwatch chrono chronometre' },
    { e: '⏲️', t: 'timer minuteur' },
    { e: '🕰️', t: 'mantel clock horloge' },
    { e: '⌛', t: 'hourglass sablier done' },
    { e: '⏳', t: 'hourglass sablier flow running' },
    { e: '📡', t: 'satellite antenne' },
    { e: '🔭', t: 'telescope astronomie' },
    { e: '🔬', t: 'microscope science' },
    { e: '💊', t: 'pill pilule medicine medicament' },
    { e: '💉', t: 'syringe seringue injection vaccin' },
    { e: '🩹', t: 'bandage pansement' },
    { e: '🩺', t: 'stethoscope medecin' },
    { e: '🧪', t: 'tube eprouvette chimie chemistry' },
    { e: '🧬', t: 'dna adn gene' },
    { e: '🔍', t: 'search magnify loupe rechercher find left' },
    { e: '🔎', t: 'search magnify loupe rechercher find right' },
    { e: '🗝️', t: 'key cle old' },
    { e: '🔑', t: 'key cle' },
    { e: '🔐', t: 'lock key cle cadenas' },
    { e: '🔒', t: 'lock cadenas verrouille secure' },
    { e: '🔓', t: 'unlock cadenas ouvert' },
    { e: '🛡️', t: 'shield bouclier protection' },
    { e: '🔨', t: 'hammer marteau' },
    { e: '⚒️', t: 'tools outils hammer pick' },
    { e: '🛠️', t: 'tools outils hammer wrench' },
    { e: '🔧', t: 'wrench cle anglaise' },
    { e: '🔩', t: 'nut bolt ecrou' },
    { e: '⚙️', t: 'gear settings parametres engrenage config' },
    { e: '🪛', t: 'screwdriver tournevis' },
    { e: '🪝', t: 'hook crochet' },
    { e: '🧰', t: 'toolbox caisse outils' },
    { e: '🧲', t: 'magnet aimant' },
    { e: '🧱', t: 'brick brique' },
    { e: '⛏️', t: 'pick pioche' },
    { e: '🪓', t: 'axe hache' },
  ]},
  { label: 'snippet.emoji_cat_office', emojis: [
    { e: '📝', t: 'memo note ecrire write' },
    { e: '✏️', t: 'pencil crayon' },
    { e: '🖊️', t: 'pen stylo bille' },
    { e: '🖋️', t: 'fountain pen stylo plume' },
    { e: '🖌️', t: 'paintbrush pinceau' },
    { e: '🖍️', t: 'crayon feutre' },
    { e: '📐', t: 'triangle ruler equerre' },
    { e: '📏', t: 'ruler regle' },
    { e: '📎', t: 'paperclip trombone attach' },
    { e: '🖇️', t: 'linked paperclips trombones' },
    { e: '📌', t: 'pushpin punaise' },
    { e: '📍', t: 'pin location lieu' },
    { e: '✂️', t: 'scissors ciseaux cut couper' },
    { e: '🗂️', t: 'card index dividers onglets' },
    { e: '📁', t: 'folder dossier' },
    { e: '📂', t: 'open folder dossier ouvert' },
    { e: '🗃️', t: 'card box boite fiches' },
    { e: '🗄️', t: 'file cabinet archive armoire' },
    { e: '📋', t: 'clipboard presse papier' },
    { e: '📃', t: 'page curl document' },
    { e: '📄', t: 'document page' },
    { e: '📜', t: 'scroll parchemin' },
    { e: '📰', t: 'newspaper journal presse' },
    { e: '🗞️', t: 'rolled newspaper journal' },
    { e: '📓', t: 'notebook carnet cahier' },
    { e: '📔', t: 'notebook decorated carnet' },
    { e: '📒', t: 'ledger registre' },
    { e: '📕', t: 'book rouge red ferme' },
    { e: '📗', t: 'book vert green' },
    { e: '📘', t: 'book bleu blue' },
    { e: '📙', t: 'book orange' },
    { e: '📚', t: 'books livres bibliotheque' },
    { e: '📖', t: 'open book livre ouvert' },
    { e: '🔖', t: 'bookmark marque page signet' },
    { e: '🏷️', t: 'label tag etiquette' },
    { e: '💼', t: 'briefcase mallette attache case business' },
    { e: '🗒️', t: 'spiral note notepad' },
    { e: '🗓️', t: 'spiral calendar calendrier' },
    { e: '📅', t: 'calendar calendrier date' },
    { e: '📆', t: 'tear off calendar calendrier' },
    { e: '🗑️', t: 'trash poubelle delete supprimer can' },
    { e: '🪣', t: 'bucket seau' },
    { e: '📦', t: 'package colis box boite' },
    { e: '📫', t: 'mailbox boite lettres closed flag up' },
    { e: '📪', t: 'mailbox boite lettres closed flag down' },
    { e: '📬', t: 'mailbox open boite lettres flag up' },
    { e: '📭', t: 'mailbox open boite lettres flag down' },
    { e: '📮', t: 'postbox boite aux lettres' },
    { e: '✉️', t: 'envelope enveloppe' },
    { e: '📧', t: 'email courriel mail at' },
    { e: '📨', t: 'email incoming recu' },
    { e: '📩', t: 'email arrow envoi' },
    { e: '📤', t: 'outbox envoyer sent' },
    { e: '📥', t: 'inbox recevoir' },
    { e: '📊', t: 'bar chart graphique barres histogramme' },
    { e: '📈', t: 'chart up tendance hausse croissance' },
    { e: '📉', t: 'chart down baisse decroissance' },
  ]},
  { label: 'snippet.emoji_cat_symbols', emojis: [
    { e: '🆕', t: 'new nouveau nouvelle brand fresh neuf' },
    { e: '♻️', t: 'existing existant existante recycle recycler reuse reutiliser' },
    { e: '✅', t: 'check ok valide coche green' },
    { e: '☑️', t: 'check ballot case' },
    { e: '✔️', t: 'check coche mark' },
    { e: '❌', t: 'cross error erreur red rouge croix ko' },
    { e: '✖️', t: 'multiply multiplier cross' },
    { e: '❎', t: 'cross square button' },
    { e: '⚠️', t: 'warning attention danger' },
    { e: 'ℹ️', t: 'info information' },
    { e: '❓', t: 'question red interrogation' },
    { e: '❔', t: 'question white interrogation' },
    { e: '❗', t: 'exclamation important red' },
    { e: '❕', t: 'exclamation white' },
    { e: '‼️', t: 'double exclamation' },
    { e: '⁉️', t: 'exclamation question' },
    { e: '🚀', t: 'rocket fusee launch lancer' },
    { e: '🎉', t: 'party popper tada fete celebration' },
    { e: '🎊', t: 'confetti ball fete' },
    { e: '🏆', t: 'trophy trophee winner' },
    { e: '🥇', t: 'gold medal medaille or first' },
    { e: '🥈', t: 'silver medal medaille argent second' },
    { e: '🥉', t: 'bronze medal medaille third' },
    { e: '🏅', t: 'medal medaille sports' },
    { e: '🎖️', t: 'military medal medaille' },
    { e: '🎯', t: 'target cible dart' },
    { e: '🎁', t: 'gift cadeau present' },
    { e: '🔔', t: 'bell cloche notify notification' },
    { e: '🔕', t: 'bell off muted silence' },
    { e: '📢', t: 'loudspeaker annonce public' },
    { e: '📣', t: 'megaphone porte voix' },
    { e: '📯', t: 'postal horn cor' },
    { e: '➕', t: 'plus add heavy' },
    { e: '➖', t: 'minus moins heavy' },
    { e: '➗', t: 'divide division' },
    { e: '♾️', t: 'infinity infini' },
    { e: '💲', t: 'dollar sign dollars money argent' },
    { e: '💱', t: 'currency exchange change devise' },
    { e: '©️', t: 'copyright' },
    { e: '®️', t: 'registered' },
    { e: '™️', t: 'trademark marque' },
    { e: '↔️', t: 'left right arrow fleche horizontal' },
    { e: '↕️', t: 'up down arrow fleche vertical' },
    { e: '↖️', t: 'up left arrow fleche' },
    { e: '↗️', t: 'up right arrow fleche' },
    { e: '↘️', t: 'down right arrow fleche' },
    { e: '↙️', t: 'down left arrow fleche' },
    { e: '⬅️', t: 'left arrow fleche gauche' },
    { e: '➡️', t: 'right arrow fleche droite' },
    { e: '⬆️', t: 'up arrow fleche haut' },
    { e: '⬇️', t: 'down arrow fleche bas' },
    { e: '🔃', t: 'clockwise vertical arrows' },
    { e: '🔄', t: 'counterclockwise arrows reload refresh recharger' },
    { e: '🔁', t: 'repeat loop boucle' },
    { e: '🔂', t: 'repeat single once' },
    { e: '🔀', t: 'shuffle melange random' },
    { e: '🔼', t: 'up button triangle' },
    { e: '🔽', t: 'down button triangle' },
    { e: '⏫', t: 'fast up double triangle' },
    { e: '⏬', t: 'fast down double triangle' },
    { e: '⏪', t: 'rewind back' },
    { e: '⏩', t: 'fast forward avance' },
    { e: '⏭️', t: 'next track suivant' },
    { e: '⏮️', t: 'previous track precedent' },
    { e: '⏯️', t: 'play pause' },
    { e: '▶️', t: 'play lecture' },
    { e: '⏸️', t: 'pause' },
    { e: '⏹️', t: 'stop' },
    { e: '⏺️', t: 'record enregistrer' },
    { e: '⏏️', t: 'eject ejecter' },
    { e: '🎵', t: 'music note musique' },
    { e: '🎶', t: 'music notes musique' },
    { e: '🔈', t: 'speaker low bas' },
    { e: '🔉', t: 'speaker medium moyen' },
    { e: '🔊', t: 'speaker loud fort haut son sound' },
    { e: '🔇', t: 'muted mute silence' },
    { e: '📶', t: 'signal antenne bars' },
    { e: '🛜', t: 'wireless wifi' },
    { e: '🔗', t: 'link lien chain' },
    { e: '⛓️', t: 'chains chaine' },
    { e: '🏁', t: 'finish flag checkered fin arrivee' },
    { e: '🚩', t: 'flag drapeau triangular' },
    { e: '🏳️', t: 'white flag drapeau blanc' },
    { e: '🏴', t: 'black flag drapeau noir' },
    { e: '🏳️‍🌈', t: 'rainbow lgbt pride drapeau arc en ciel' },
    { e: '🏳️‍⚧️', t: 'trans drapeau transgender' },
    { e: '🏴‍☠️', t: 'pirate drapeau jolly roger' },
  ]},
];

let _emojiGridWired = false;

function _emojiBtnHtml(item) {
  return `<button type="button" data-emoji="${item.e}" title="${item.t.split(' ').slice(0, 3).join(', ')}" class="emoji-btn w-7 h-7 text-lg rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center">${item.e}</button>`;
}

function _renderEmojiCategories() {
  return _EMOJI_CATEGORIES.map((cat) => `
    <div>
      <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 px-1">${window.t(cat.label)}</div>
      <div class="flex flex-wrap gap-1">
        ${cat.emojis.map(_emojiBtnHtml).join('')}
      </div>
    </div>
  `).join('');
}

function _renderEmojiSearch(query) {
  const q = query.toLowerCase().trim();
  const matches = [];
  for (const cat of _EMOJI_CATEGORIES) {
    for (const item of cat.emojis) {
      if (item.t.includes(q) || item.e === query) matches.push(item);
    }
  }
  if (matches.length === 0) {
    return `<div class="text-xs text-gray-400 dark:text-gray-600 px-1 py-2">${window.t('snippet.emoji_no_results')}</div>`;
  }
  return `<div class="flex flex-wrap gap-1">${matches.map(_emojiBtnHtml).join('')}</div>`;
}

function emojiInit() {
  const grid = document.getElementById('snip-emoji-grid');
  if (!grid) return;
  grid.innerHTML = _renderEmojiCategories();

  if (!_emojiGridWired) {
    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('.emoji-btn');
      if (btn && btn.dataset.emoji) emojiAppend(btn.dataset.emoji);
    });
    const searchInput = document.getElementById('snip-emoji-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => emojiFilter(e.target.value));
    }
    _emojiGridWired = true;
  }

  const searchInput = document.getElementById('snip-emoji-search');
  if (searchInput) searchInput.value = '';
  snippetUpdatePreview();
}

function emojiFilter(query) {
  const grid = document.getElementById('snip-emoji-grid');
  if (!grid) return;
  const q = (query || '').trim();
  grid.innerHTML = q.length < 2 ? _renderEmojiCategories() : _renderEmojiSearch(q);
}

function emojiAppend(emoji) {
  const input = document.getElementById('snip-emoji-string');
  if (!input) return;
  input.value += emoji;
  snippetUpdatePreview();
}

function emojiClear() {
  const input = document.getElementById('snip-emoji-string');
  if (!input) return;
  input.value = '';
  snippetUpdatePreview();
}

const _COLOR_SWATCHES = {
  info:    { bg: "#eff6ff", border: "#3b82f6", text: "#1e3a5f" },
  success: { bg: "#f0fdf4", border: "#22c55e", text: "#14532d" },
  warning: { bg: "#fffbeb", border: "#f59e0b", text: "#451a03" },
  danger:  { bg: "#fef2f2", border: "#ef4444", text: "#450a0a" },
  note:    { bg: "#f5f3ff", border: "#8b5cf6", text: "#2e1065" },
  neutral: { bg: "#f9fafb", border: "#6b7280", text: "#111827" },
};
let _colorSectionSwatch = "info";
let _colorTextSwatch = "info";

function colorSectionPickSwatch(btn) {
  document.querySelectorAll(".color-swatch-btn").forEach((b) => {
    b.classList.remove("selected-swatch", "ring-offset-2");
  });
  btn.classList.add("selected-swatch", "ring-offset-2");
  const color = btn.getAttribute("data-color-swatch");
  // Apply the matching ring color
  const ringMap = { info: "ring-blue-400", success: "ring-green-400", warning: "ring-amber-400", danger: "ring-red-400", note: "ring-purple-400", neutral: "ring-gray-400" };
  btn.classList.add(ringMap[color] || "ring-blue-400");
  _colorSectionSwatch = color;
  snippetUpdatePreview();
}

function colorTextPickSwatch(btn) {
  document.querySelectorAll(".color-text-swatch-btn").forEach((b) => {
    b.classList.remove("selected-text-swatch", "ring-offset-2");
  });
  btn.classList.add("selected-text-swatch", "ring-offset-2");
  const color = btn.getAttribute("data-color-text-swatch");
  const ringMap = { info: "ring-blue-400", success: "ring-green-400", warning: "ring-amber-400", danger: "ring-red-400", note: "ring-purple-400", neutral: "ring-gray-400" };
  btn.classList.add(ringMap[color] || "ring-blue-400");
  _colorTextSwatch = color;
  snippetUpdatePreview();
}

function _stripMdInline(s) {
  return s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1$2")
    .replace(/(^|[^_])_([^_]+)_(?!_)/g, "$1$2")
    .trim();
}

function _slugifyHeading(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function _extractHeadingsFromMarkdown(content) {
  const out = [];
  const lines = (content || "").split("\n");
  let inFence = false;
  for (const line of lines) {
    if (/^```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!m) continue;
    const text = _stripMdInline(m[2]);
    const slug = _slugifyHeading(text);
    if (slug) out.push({ level: m[1].length, text, slug });
  }
  return out;
}

function _collectEditorHeadings() {
  const editor = document.getElementById("doc-editor");
  return _extractHeadingsFromMarkdown(editor ? editor.value : "");
}

function _renderAnchorOptions(sel, headings, emptyKey) {
  if (!sel) return;
  if (headings.length === 0) {
    sel.innerHTML = `<option value="" disabled selected>${window.t(emptyKey)}</option>`;
    return;
  }
  sel.innerHTML = headings
    .map((h) => {
      const indent = "· ".repeat(Math.max(0, h.level - 1));
      return `<option value="${esc(h.slug)}">${esc(indent + h.text)}</option>`;
    })
    .join("");
}

function _populateAnchorSelect() {
  _renderAnchorOptions(
    document.getElementById("snip-anchor-id"),
    _collectEditorHeadings(),
    'snippet.link_anchor_no_headings',
  );
}

async function snippetAnchorDocChanged() {
  const docSel = document.getElementById("snip-anchor-doc-select");
  const anchorSel = document.getElementById("snip-anchor-doc-id");
  if (!docSel || !anchorSel) return;
  const docId = docSel.value;
  if (!docId) {
    _renderAnchorOptions(anchorSel, [], 'snippet.link_anchor_no_headings');
    snippetUpdatePreview();
    return;
  }
  anchorSel.innerHTML = `<option value="" disabled selected>${window.t('common.loading')}</option>`;
  try {
    const doc = await fetch("/api/documents/" + encodeURIComponent(docId))
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      });
    const headings = _extractHeadingsFromMarkdown(doc.content || "");
    _renderAnchorOptions(anchorSel, headings, 'snippet.link_anchor_no_headings');
  } catch {
    _renderAnchorOptions(anchorSel, [], 'snippet.link_anchor_no_headings');
  }
  snippetUpdatePreview();
}

function openSnippetsModal() {
  const editor = document.getElementById("doc-editor");
  _snippetSelStart = editor.selectionStart;
  _snippetSelEnd = editor.selectionEnd;

  const docOpts = allDocs
    .map((d) => `<option value="${d.id}">${d.title}</option>`)
    .join("");
  document.getElementById("snip-doc-select").innerHTML = docOpts;
  document.getElementById("snip-anchor-doc-select").innerHTML = docOpts;
  _populateAnchorSelect();
  snippetAnchorDocChanged();

  const msgEl = document.getElementById("snippet-detect-msg");
  const selectedText = editor.value.slice(
    _snippetSelStart,
    _snippetSelEnd,
  );

  if (selectedText) {
    const detected = detectSnippetType(selectedText);
    if (detected) {
      document.getElementById("snippet-type").value = detected;
      snippetTypeChanged();
      parseAndFillSnippet(selectedText, detected);
      const labels = {
        collapsible: window.t('snippet.collapsible'),
        link: window.t('snippet.link'),
        "doc-link": window.t('snippet.link_doc'),
        "anchor-link": window.t('snippet.link_anchor'),
        "anchor-doc-link": window.t('snippet.link_doc_anchor'),
        "ordered-list": window.t('snippet.numbered_list'),
        "unordered-list": window.t('snippet.bullet_list'),
        "code-block": window.t('snippet.code_block'),
        blockquote: window.t('snippet.blockquote'),
        separator: window.t('snippet.separator'),
        image: window.t('snippet.image'),
        table: window.t('snippet.table'),
        tree: window.t('snippet.tree'),
        "colored-section": window.t('snippet.colored_section'),
        "colored-text": window.t('snippet.colored_text'),
      };
      msgEl.textContent = window.t('snippet.detected_msg').replace('{type}', labels[detected] ?? detected);
      msgEl.className =
        "rounded-lg px-3 py-2 text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800";
    } else {
      document.getElementById("snippet-type").value = "diagram";
      snippetTypeChanged();
      msgEl.textContent = window.t('snippet.unknown_type_msg');
      msgEl.className =
        "rounded-lg px-3 py-2 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800";
    }
    msgEl.classList.remove("hidden");
  } else {
    msgEl.classList.add("hidden");
    document.getElementById("snippet-type").value = "diagram";
    snippetTypeChanged();
  }

  document.getElementById("snippets-modal").classList.remove("hidden");
}

function closeSnippetsModal() {
  document.getElementById("snippets-modal").classList.add("hidden");
}

function snippetTypeChanged() {
  const type = document.getElementById("snippet-type").value;
  _SNIPPET_PANELS.forEach((p) => {
    const panel = document.getElementById("snip-panel-" + p);
    if (panel) panel.classList.toggle("hidden", p !== type);
  });
  const previewWrap = document.getElementById("snippet-preview")?.parentElement;
  if (previewWrap) previewWrap.classList.toggle("hidden", type === "attachment");

  if (type === "table") tableInit();
  else if (type === "tree") treeInit();
  else if (type === "diagram") snippetDiagInit();
  else if (type === "emojis") emojiInit();
  else if (type === "attachment") {
    /* no preview — file picker opens on Insert */
  } else snippetUpdatePreview();
}

async function snippetDiagInit() {
  let diagrams = [];
  try {
    diagrams = await fetch("/api/diagrams").then((r) => r.json());
  } catch {
    diagrams = [];
  }
  const sel = document.getElementById("snip-diag-select");
  sel.innerHTML = diagrams.length
    ? diagrams
        .map(
          (d) => `<option value="${esc(d.id)}">${esc(d.title)}</option>`,
        )
        .join("")
    : `<option value="" disabled>${window.t('snippet.diagram_no_diagrams')}</option>`;

  // Pre-fill image name from current doc title
  const docTitle = document
    .getElementById("doc-title")
    .textContent.trim();
  const slug = docTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  document.getElementById("snip-diag-img-name").value = slug
    ? slug + ".png"
    : "diagram.png";
  document.getElementById("snip-diag-new-name").value = docTitle
    ? docTitle + " Diagram"
    : "";

  document.getElementById("snip-diag-mode-existing").checked = true;
  snippetDiagModeChanged();
}

function snippetDiagModeChanged() {
  const isNew = document.getElementById("snip-diag-mode-new").checked;
  document
    .getElementById("snip-diag-existing-section")
    .classList.toggle("hidden", isNew);
  document
    .getElementById("snip-diag-new-section")
    .classList.toggle("hidden", !isNew);
  snippetDiagSyncImgName();
  snippetUpdatePreview();
}

function snippetDiagSyncImgName() {
  const isNew = document.getElementById("snip-diag-mode-new").checked;
  let label;
  if (isNew) {
    label = document.getElementById("snip-diag-new-name").value.trim();
  } else {
    const sel = document.getElementById("snip-diag-select");
    label = sel.options[sel.selectedIndex]?.text ?? "";
  }
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  document.getElementById("snip-diag-img-name").value = slug
    ? slug + ".png"
    : "diagram.png";
}

function buildSnippetMarkdown() {
  const type = document.getElementById("snippet-type").value;
  switch (type) {
    case "collapsible": {
      const summary =
        document.getElementById("snip-collapsible-summary").value ||
        window.t('snippet.collapsible_summary_value');
      return `<details>\n<summary>${summary}</summary>\n\n## Titre\n\nTexte\n\n</details>`;
    }
    case "link": {
      const text =
        document.getElementById("snip-link-text").value ||
        window.t('snippet.link_text_placeholder');
      const url =
        document.getElementById("snip-link-url").value || "https://...";
      return `<a href="${url}" target="_blank">${text}</a>`; // [${text}](${url})
    }
    case "doc-link": {
      const sel = document.getElementById("snip-doc-select");
      const docId = sel.value;
      const customText =
        document.getElementById("snip-doc-link-text").value;
      const docTitle = sel.options[sel.selectedIndex]?.text ?? docId;
      const text = customText || docTitle;
      return `[${text}](?doc=${encodeURIComponent(docId)})`;
    }
    case "anchor-link": {
      const text =
        document.getElementById("snip-anchor-text").value ||
        window.t('snippet.link_section_placeholder');
      const anchor =
        document.getElementById("snip-anchor-id").value ||
        window.t('snippet.link_anchor_placeholder');
      return `[${text}](#${anchor})`;
    }
    case "anchor-doc-link": {
      const sel = document.getElementById("snip-anchor-doc-select");
      const docId = sel.value;
      const text =
        document.getElementById("snip-anchor-doc-text").value ||
        window.t('snippet.link_section_placeholder');
      const anchor =
        document.getElementById("snip-anchor-doc-id").value ||
        window.t('snippet.link_anchor_placeholder');
      return `[${text}](?doc=${encodeURIComponent(docId)}#${anchor})`;
    }
    case "ordered-list":
      return [
        "1. Élément 1",
        "2. Élément 2",
        "   1. Sous-élément 2.1",
        "   2. Sous-élément 2.2",
        "3. Élément 3",
        "   1. Sous-élément 3.1",
        "      1. Sous-sous-élément 3.1.1",
      ].join("\n");
    case "unordered-list":
      return [
        "- Élément 1",
        "- Élément 2",
        "  - Sous-élément 2.1",
        "  - Sous-élément 2.2",
        "- Élément 3",
        "  - Sous-élément 3.1",
        "    - Sous-sous-élément 3.1.1",
      ].join("\n");
    case "code-block": {
      const lang = document.getElementById("snip-code-lang").value || "";
      return `\`\`\`${lang}\n// code ici\n\`\`\``;
    }
    case "blockquote":
      return `> Citation ici\n>\n> — Auteur`;
    case "separator":
      return `\n---\n`;
    case "image": {
      const alt =
        document.getElementById("snip-image-alt").value || "image";
      const url =
        document.getElementById("snip-image-url").value ||
        "./images/mon-image.png";
      return `![${alt}](${url})`;
    }
    case "table":
      return buildTableMarkdown();
    case "tree":
      return buildTreeMarkdown();
    case "diagram": {
      const isNew = document.getElementById("snip-diag-mode-new").checked;
      const imgName =
        document.getElementById("snip-diag-img-name").value.trim() ||
        "diagram.png";
      let diagId, diagLabel;
      if (isNew) {
        diagId = "d" + Date.now();
        diagLabel =
          document.getElementById("snip-diag-new-name").value.trim() ||
          "Diagram";
      } else {
        const sel = document.getElementById("snip-diag-select");
        diagId = sel.value;
        diagLabel = sel.options[sel.selectedIndex]?.text || "Diagram";
      }
      return `[![${diagLabel}](./images/${imgName})](/diagram?id=${diagId})`;
    }
    case "colored-text": {
      const c = _COLOR_SWATCHES[_colorTextSwatch] || _COLOR_SWATCHES.info;
      const content = document.getElementById("snip-colored-text-content").value || window.t('snippet.colored_text_content_placeholder');
      return `<span style="color:${c.border};">${content}</span>`;
    }
    case "colored-section": {
      const c = _COLOR_SWATCHES[_colorSectionSwatch] || _COLOR_SWATCHES.info;
      const content = document.getElementById("snip-colored-content").value || window.t('snippet.colored_section_content_placeholder');
      return `<div style="background:${c.bg};border-left:4px solid ${c.border};color:${c.text};padding:1rem 1.25rem;border-radius:0.375rem;margin:1rem 0;">\n\n${content}\n\n</div>`;
    }
    case "emojis":
      return document.getElementById("snip-emoji-string").value;
    default:
      return "";
  }
}

function snippetUpdatePreview() {
  document.getElementById("snippet-preview").textContent =
    buildSnippetMarkdown();
}

function insertSnippet() {
  const type = document.getElementById("snippet-type").value;
  if (type === "diagram") {
    insertDiagramSnippet();
    return;
  }
  if (type === "attachment") {
    closeSnippetsModal();
    if (typeof openFilePicker === "function") openFilePicker();
    return;
  }
  const text = buildSnippetMarkdown();
  closeSnippetsModal();
  const editor = document.getElementById("doc-editor");
  const before = editor.value.slice(0, _snippetSelStart);
  const after = editor.value.slice(_snippetSelEnd);
  editor.value = before + text + after;
  editor.selectionStart = editor.selectionEnd =
    _snippetSelStart + text.length;
  editor.focus();
}

async function insertDiagramSnippet() {
  const isNew = document.getElementById("snip-diag-mode-new").checked;
  const imgName =
    document.getElementById("snip-diag-img-name").value.trim() ||
    "diagram.png";
  let diagId, diagLabel;
  if (isNew) {
    diagId = "d" + Date.now();
    diagLabel =
      document.getElementById("snip-diag-new-name").value.trim() ||
      "Diagram";
    try {
      await fetch(`/api/diagrams/${diagId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: diagLabel, nodes: [], edges: [] }),
      });
    } catch (err) {
      alert(window.t('error.create_diagram') + err.message);
      return;
    }
  } else {
    const sel = document.getElementById("snip-diag-select");
    diagId = sel.value;
    diagLabel = sel.options[sel.selectedIndex]?.text || "Diagram";
  }

  // Insert at cursor
  const md = `[![${diagLabel}](./images/${imgName})](/diagram?id=${diagId})`;
  closeSnippetsModal();
  const editor = document.getElementById("doc-editor");
  const before = editor.value.slice(0, _snippetSelStart);
  const after = editor.value.slice(_snippetSelEnd);
  editor.value = before + md + after;

  // Auto-save then redirect to diagram editor
  try {
    const newContent = editor.value;
    const res = await fetch("/api/documents/" + currentDocId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newContent }),
    });
    if (!res.ok) throw new Error(await res.text());
    currentDocContent = newContent;
  } catch (err) {
    alert("Erreur lors de la sauvegarde : " + err.message);
    return;
  }

  window.location.href = `/diagram?id=${diagId}&img=${encodeURIComponent(imgName)}`;
}

// ── Snippet parsing (detection lives in /snippet-detect.js) ────────────────
function parseAndFillSnippet(text, type) {
  const t = text.trim();
  switch (type) {
    case "collapsible": {
      const m = t.match(/<summary>([\s\S]*?)<\/summary>/i);
      if (m)
        document.getElementById("snip-collapsible-summary").value =
          m[1].trim();
      break;
    }
    case "link": {
      const m = t.match(/^\[([\s\S]*?)\]\(([\s\S]*?)\)$/);
      if (m) {
        document.getElementById("snip-link-text").value = m[1];
        document.getElementById("snip-link-url").value = m[2];
      }
      break;
    }
    case "doc-link": {
      const m = t.match(/^\[([\s\S]*?)\]\(\?doc=([\s\S]*?)\)$/);
      if (m) {
        const docId = decodeURIComponent(m[1] === "" ? m[2] : m[2]);
        const sel = document.getElementById("snip-doc-select");
        for (const opt of sel.options) {
          if (opt.value === decodeURIComponent(m[2])) {
            sel.value = opt.value;
            break;
          }
        }
        const autoTitle = sel.options[sel.selectedIndex]?.text ?? "";
        document.getElementById("snip-doc-link-text").value =
          m[1] === autoTitle ? "" : m[1];
      }
      break;
    }
    case "anchor-link": {
      const m = t.match(/^\[([\s\S]*?)\]\(#([\s\S]*?)\)$/);
      if (m) {
        document.getElementById("snip-anchor-text").value = m[1];
        const sel = document.getElementById("snip-anchor-id");
        const wanted = m[2];
        const hasOpt = Array.from(sel.options).some(
          (o) => o.value === wanted,
        );
        if (!hasOpt) {
          const opt = document.createElement("option");
          opt.value = wanted;
          opt.textContent = wanted;
          sel.insertBefore(opt, sel.firstChild);
        }
        sel.value = wanted;
      }
      break;
    }
    case "anchor-doc-link": {
      const m = t.match(
        /^\[([\s\S]*?)\]\(\?doc=([\s\S]*?)#([\s\S]*?)\)$/,
      );
      if (m) {
        const sel = document.getElementById("snip-anchor-doc-select");
        for (const opt of sel.options) {
          if (opt.value === decodeURIComponent(m[2])) {
            sel.value = opt.value;
            break;
          }
        }
        document.getElementById("snip-anchor-doc-text").value = m[1];
        const wanted = m[3];
        snippetAnchorDocChanged().then(() => {
          const anchorSel = document.getElementById("snip-anchor-doc-id");
          if (!anchorSel) return;
          const hasOpt = Array.from(anchorSel.options).some(
            (o) => o.value === wanted,
          );
          if (!hasOpt) {
            const opt = document.createElement("option");
            opt.value = wanted;
            opt.textContent = wanted;
            anchorSel.insertBefore(opt, anchorSel.firstChild);
          }
          anchorSel.value = wanted;
          snippetUpdatePreview();
        });
      }
      break;
    }
    case "code-block": {
      const m = t.match(/^```(\w*)\n/);
      document.getElementById("snip-code-lang").value = m ? m[1] : "";
      break;
    }
    case "image": {
      const m = t.match(/^!\[([\s\S]*?)\]\(([\s\S]*?)\)$/);
      if (m) {
        document.getElementById("snip-image-alt").value = m[1];
        document.getElementById("snip-image-url").value = m[2];
      }
      break;
    }
    case "table": {
      const allLines = t
        .split("\n")
        .filter((l) => /^\|.*\|$/.test(l.trim()));
      const dataLines = allLines.filter(
        (l) => !/^\| *[-: ][-| :]*\|/.test(l),
      );
      _tableData = dataLines.map((line) =>
        line
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim()),
      );
      const maxCols = Math.max(..._tableData.map((r) => r.length));
      _tableData.forEach((row) => {
        while (row.length < maxCols) row.push("");
      });
      tableRenderGrid();
      break;
    }
    case "tree": {
      const inner = t.replace(/^```text\n/, "").replace(/\n```$/, "");
      _treeItems = inner.split("\n").map((line) => {
        const m = line.match(/^((?:│   |    )*)(?:├── |└── )([\s\S]+)$/);
        if (m) return { name: m[2], depth: m[1].length / 4 + 1 };
        return { name: line, depth: 0 };
      });
      treeRenderList();
      break;
    }
    case "colored-text": {
      const m = t.match(/^<span\s[^>]*color:([^;>"]+)[^>]*>([\s\S]*)<\/span>$/);
      if (m) {
        const col = m[1].trim();
        const found = Object.entries(_COLOR_SWATCHES).find(([, v]) => v.border === col);
        if (found) {
          _colorTextSwatch = found[0];
          document.querySelectorAll(".color-text-swatch-btn").forEach((b) => b.classList.remove("selected-text-swatch", "ring-offset-2"));
          const activeBtn = document.querySelector(`[data-color-text-swatch="${_colorTextSwatch}"]`);
          if (activeBtn) activeBtn.classList.add("selected-text-swatch", "ring-offset-2");
        }
        document.getElementById("snip-colored-text-content").value = m[2];
      }
      break;
    }
    case "colored-section": {
      // Extract border color from inline style to guess the swatch
      const borderM = t.match(/border-left:[^;]*solid\s+(#[0-9a-fA-F]{6})/);
      if (borderM) {
        const found = Object.entries(_COLOR_SWATCHES).find(([, v]) => v.border === borderM[1]);
        if (found) {
          _colorSectionSwatch = found[0];
          document.querySelectorAll(".color-swatch-btn").forEach((b) => {
            b.classList.remove("selected-swatch", "ring-offset-2");
          });
          const activeBtn = document.querySelector(`[data-color-swatch="${_colorSectionSwatch}"]`);
          if (activeBtn) activeBtn.classList.add("selected-swatch", "ring-offset-2");
        }
      }
      const contentM = t.match(/^<div[^>]*>\n\n([\s\S]*?)\n\n<\/div>$/);
      if (contentM) document.getElementById("snip-colored-content").value = contentM[1];
      break;
    }
  }
  snippetUpdatePreview();
}
