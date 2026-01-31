import { Controller } from "@hotwired/stimulus"
import { escapeHtml } from "lib/text_utils"

// Emoji Picker Controller
// Handles emoji picker dialog with search and grid navigation
// Dispatches emoji-picker:selected event with emoji shortcode

// Common emoji data: [shortcode, emoji character, keywords for search]
const EMOJI_DATA = [
  // Smileys & Emotion
  ["grinning", "😀", "smile happy"],
  ["smiley", "😃", "smile happy"],
  ["smile", "😄", "happy joy"],
  ["grin", "😁", "happy teeth"],
  ["laughing", "😆", "happy lol xd"],
  ["sweat_smile", "😅", "nervous relief"],
  ["rofl", "🤣", "lol laugh floor"],
  ["joy", "😂", "laugh cry tears"],
  ["slightly_smiling_face", "🙂", "smile"],
  ["upside_down_face", "🙃", "silly sarcasm"],
  ["wink", "😉", "flirt"],
  ["blush", "😊", "happy shy"],
  ["innocent", "😇", "angel halo"],
  ["smiling_face_with_three_hearts", "🥰", "love adore"],
  ["heart_eyes", "😍", "love crush"],
  ["star_struck", "🤩", "wow amazing"],
  ["kissing_heart", "😘", "kiss love"],
  ["kissing", "😗", "kiss"],
  ["relaxed", "☺️", "peaceful happy"],
  ["kissing_closed_eyes", "😚", "kiss love"],
  ["kissing_smiling_eyes", "😙", "kiss"],
  ["smiling_face_with_tear", "🥲", "grateful sad happy"],
  ["yum", "😋", "delicious tasty"],
  ["stuck_out_tongue", "😛", "playful silly"],
  ["stuck_out_tongue_winking_eye", "😜", "crazy playful"],
  ["zany_face", "🤪", "crazy silly wild"],
  ["stuck_out_tongue_closed_eyes", "😝", "playful"],
  ["money_mouth_face", "🤑", "rich money"],
  ["hugs", "🤗", "hug embrace"],
  ["hand_over_mouth", "🤭", "oops giggle"],
  ["shushing_face", "🤫", "quiet secret"],
  ["thinking", "🤔", "hmm consider ponder"],
  ["zipper_mouth_face", "🤐", "secret quiet"],
  ["raised_eyebrow", "🤨", "skeptic doubt"],
  ["neutral_face", "😐", "meh indifferent"],
  ["expressionless", "😑", "blank"],
  ["no_mouth", "😶", "silent mute"],
  ["smirk", "😏", "smug flirt"],
  ["unamused", "😒", "annoyed bored"],
  ["roll_eyes", "🙄", "whatever annoyed"],
  ["grimacing", "😬", "awkward nervous"],
  ["lying_face", "🤥", "pinocchio liar"],
  ["relieved", "😌", "peaceful content"],
  ["pensive", "😔", "sad thoughtful"],
  ["sleepy", "😪", "tired"],
  ["drooling_face", "🤤", "hungry delicious"],
  ["sleeping", "😴", "zzz tired"],
  ["mask", "😷", "sick covid"],
  ["face_with_thermometer", "🤒", "sick fever"],
  ["face_with_head_bandage", "🤕", "hurt injury"],
  ["nauseated_face", "🤢", "sick gross"],
  ["vomiting_face", "🤮", "sick barf"],
  ["sneezing_face", "🤧", "sick achoo"],
  ["hot_face", "🥵", "heat sweating"],
  ["cold_face", "🥶", "freezing"],
  ["woozy_face", "🥴", "drunk dizzy"],
  ["dizzy_face", "😵", "dead unconscious"],
  ["exploding_head", "🤯", "mind blown"],
  ["cowboy_hat_face", "🤠", "western"],
  ["partying_face", "🥳", "party celebrate"],
  ["disguised_face", "🥸", "glasses mustache"],
  ["sunglasses", "😎", "cool"],
  ["nerd_face", "🤓", "geek glasses"],
  ["monocle_face", "🧐", "thinking"],
  ["confused", "😕", "puzzled"],
  ["worried", "😟", "anxious concerned"],
  ["slightly_frowning_face", "🙁", "sad"],
  ["frowning_face", "☹️", "sad"],
  ["open_mouth", "😮", "surprised wow"],
  ["hushed", "😯", "surprised"],
  ["astonished", "😲", "shocked surprised"],
  ["flushed", "😳", "embarrassed"],
  ["pleading_face", "🥺", "puppy eyes cute"],
  ["frowning", "😦", "sad"],
  ["anguished", "😧", "pain"],
  ["fearful", "😨", "scared afraid"],
  ["cold_sweat", "😰", "nervous anxious"],
  ["disappointed_relieved", "😥", "sad relieved"],
  ["cry", "😢", "sad tears"],
  ["sob", "😭", "crying sad tears"],
  ["scream", "😱", "scared horror"],
  ["confounded", "😖", "frustrated"],
  ["persevere", "😣", "struggling"],
  ["disappointed", "😞", "sad"],
  ["sweat", "😓", "nervous hard work"],
  ["weary", "😩", "tired"],
  ["tired_face", "😫", "exhausted"],
  ["yawning_face", "🥱", "tired sleepy"],
  ["triumph", "😤", "frustrated huffing"],
  ["rage", "😡", "angry mad"],
  ["angry", "😠", "mad"],
  ["cursing_face", "🤬", "swearing angry"],
  ["smiling_imp", "😈", "devil evil"],
  ["imp", "👿", "devil angry"],
  ["skull", "💀", "dead death"],
  ["skull_and_crossbones", "☠️", "death danger"],
  ["poop", "💩", "poo shit"],
  ["clown_face", "🤡", "clown"],
  ["japanese_ogre", "👹", "monster"],
  ["japanese_goblin", "👺", "monster"],
  ["ghost", "👻", "halloween spooky"],
  ["alien", "👽", "ufo space"],
  ["space_invader", "👾", "game alien"],
  ["robot", "🤖", "bot machine"],

  // Gestures & Body
  ["wave", "👋", "hello bye"],
  ["raised_back_of_hand", "🤚", "stop"],
  ["raised_hand", "✋", "stop high five"],
  ["vulcan_salute", "🖖", "spock star trek"],
  ["ok_hand", "👌", "okay perfect"],
  ["pinched_fingers", "🤌", "italian chef kiss"],
  ["pinching_hand", "🤏", "small tiny"],
  ["v", "✌️", "peace victory"],
  ["crossed_fingers", "🤞", "luck hope"],
  ["love_you_gesture", "🤟", "ily love"],
  ["metal", "🤘", "rock horns"],
  ["call_me_hand", "🤙", "call shaka"],
  ["point_left", "👈", "left"],
  ["point_right", "👉", "right"],
  ["point_up_2", "👆", "up"],
  ["fu", "🖕", "middle finger"],
  ["point_down", "👇", "down"],
  ["point_up", "☝️", "up"],
  ["+1", "👍", "thumbsup like yes"],
  ["thumbsup", "👍", "like yes approve"],
  ["-1", "👎", "thumbsdown dislike no"],
  ["thumbsdown", "👎", "dislike no disapprove"],
  ["fist", "✊", "power"],
  ["fist_oncoming", "👊", "punch"],
  ["fist_left", "🤛", "bump"],
  ["fist_right", "🤜", "bump"],
  ["clap", "👏", "applause"],
  ["raised_hands", "🙌", "celebration hooray"],
  ["open_hands", "👐", "hug"],
  ["palms_up_together", "🤲", "prayer"],
  ["handshake", "🤝", "deal agreement"],
  ["pray", "🙏", "thanks please namaste"],
  ["writing_hand", "✍️", "write"],
  ["nail_care", "💅", "beauty nails"],
  ["selfie", "🤳", "photo"],
  ["muscle", "💪", "strong flex bicep"],
  ["mechanical_arm", "🦾", "robot prosthetic"],
  ["leg", "🦵", "kick"],
  ["foot", "🦶", "kick"],
  ["ear", "👂", "hear listen"],
  ["nose", "👃", "smell"],
  ["brain", "🧠", "smart think"],
  ["eyes", "👀", "look see watching"],
  ["eye", "👁️", "see"],
  ["tongue", "👅", "taste lick"],
  ["lips", "👄", "kiss mouth"],

  // Hearts & Love
  ["heart", "❤️", "love red"],
  ["orange_heart", "🧡", "love"],
  ["yellow_heart", "💛", "love"],
  ["green_heart", "💚", "love"],
  ["blue_heart", "💙", "love"],
  ["purple_heart", "💜", "love"],
  ["black_heart", "🖤", "love dark"],
  ["brown_heart", "🤎", "love"],
  ["white_heart", "🤍", "love pure"],
  ["broken_heart", "💔", "sad breakup"],
  ["heart_exclamation", "❣️", "love"],
  ["two_hearts", "💕", "love"],
  ["revolving_hearts", "💞", "love"],
  ["heartbeat", "💓", "love"],
  ["heartpulse", "💗", "love growing"],
  ["sparkling_heart", "💖", "love"],
  ["cupid", "💘", "love arrow"],
  ["gift_heart", "💝", "love present"],
  ["mending_heart", "❤️‍🩹", "healing"],
  ["heart_on_fire", "❤️‍🔥", "passion"],
  ["kiss", "💋", "lips love"],
  ["love_letter", "💌", "email heart"],

  // Symbols & Objects
  ["100", "💯", "percent perfect"],
  ["anger", "💢", "angry"],
  ["boom", "💥", "explosion"],
  ["collision", "💥", "explosion crash"],
  ["dizzy", "💫", "star"],
  ["sweat_drops", "💦", "water"],
  ["dash", "💨", "wind fast running"],
  ["hole", "🕳️", "empty"],
  ["bomb", "💣", "explosive danger"],
  ["speech_balloon", "💬", "comment chat"],
  ["thought_balloon", "💭", "thinking"],
  ["zzz", "💤", "sleep tired"],
  ["fire", "🔥", "hot lit flame"],
  ["sparkles", "✨", "magic stars shine"],
  ["star", "⭐", "favorite"],
  ["star2", "🌟", "glowing"],
  ["zap", "⚡", "lightning electric"],
  ["rainbow", "🌈", "pride colors"],
  ["sunny", "☀️", "sun weather"],
  ["cloud", "☁️", "weather"],
  ["snowflake", "❄️", "cold winter"],
  ["umbrella", "☔", "rain weather"],
  ["coffee", "☕", "cafe drink"],
  ["tea", "🍵", "drink green"],
  ["beer", "🍺", "drink alcohol"],
  ["beers", "🍻", "cheers drink"],
  ["wine_glass", "🍷", "drink alcohol"],
  ["cocktail", "🍸", "drink martini"],
  ["tropical_drink", "🍹", "vacation"],
  ["champagne", "🍾", "celebrate party"],
  ["pizza", "🍕", "food"],
  ["hamburger", "🍔", "burger food"],
  ["fries", "🍟", "food"],
  ["taco", "🌮", "food mexican"],
  ["burrito", "🌯", "food mexican"],
  ["sushi", "🍣", "food japanese"],
  ["ramen", "🍜", "food noodles"],
  ["cake", "🎂", "birthday dessert"],
  ["cookie", "🍪", "dessert food"],
  ["chocolate_bar", "🍫", "candy sweet"],
  ["candy", "🍬", "sweet"],
  ["ice_cream", "🍨", "dessert cold"],
  ["icecream", "🍦", "dessert cone"],
  ["doughnut", "🍩", "donut dessert"],
  ["apple", "🍎", "fruit red"],
  ["green_apple", "🍏", "fruit"],
  ["banana", "🍌", "fruit"],
  ["orange", "🍊", "fruit tangerine"],
  ["lemon", "🍋", "fruit yellow"],
  ["grapes", "🍇", "fruit wine"],
  ["watermelon", "🍉", "fruit summer"],
  ["strawberry", "🍓", "fruit berry"],
  ["peach", "🍑", "fruit butt"],
  ["cherries", "🍒", "fruit"],
  ["avocado", "🥑", "fruit guacamole"],
  ["eggplant", "🍆", "vegetable aubergine"],
  ["carrot", "🥕", "vegetable"],
  ["corn", "🌽", "vegetable maize"],
  ["hot_pepper", "🌶️", "spicy chili"],
  ["broccoli", "🥦", "vegetable"],
  ["egg", "🥚", "food breakfast"],
  ["cheese", "🧀", "food"],
  ["bread", "🍞", "food toast"],
  ["croissant", "🥐", "food french"],
  ["bacon", "🥓", "food breakfast"],
  ["meat_on_bone", "🍖", "food"],
  ["poultry_leg", "🍗", "chicken food"],

  // Nature & Animals
  ["dog", "🐕", "pet puppy"],
  ["dog2", "🐶", "pet puppy cute"],
  ["cat", "🐈", "pet kitty"],
  ["cat2", "🐱", "pet kitty cute"],
  ["mouse", "🐁", "animal"],
  ["mouse2", "🐭", "animal cute"],
  ["hamster", "🐹", "pet cute"],
  ["rabbit", "🐰", "bunny easter"],
  ["fox_face", "🦊", "animal"],
  ["bear", "🐻", "animal"],
  ["panda_face", "🐼", "animal cute"],
  ["koala", "🐨", "animal"],
  ["tiger", "🐯", "animal"],
  ["lion", "🦁", "animal king"],
  ["cow", "🐮", "animal"],
  ["pig", "🐷", "animal"],
  ["frog", "🐸", "animal"],
  ["monkey_face", "🐵", "animal"],
  ["see_no_evil", "🙈", "monkey blind"],
  ["hear_no_evil", "🙉", "monkey deaf"],
  ["speak_no_evil", "🙊", "monkey mute"],
  ["monkey", "🐒", "animal"],
  ["chicken", "🐔", "animal bird"],
  ["penguin", "🐧", "animal bird"],
  ["bird", "🐦", "animal"],
  ["baby_chick", "🐤", "animal bird"],
  ["hatching_chick", "🐣", "animal bird"],
  ["hatched_chick", "🐥", "animal bird"],
  ["duck", "🦆", "animal bird"],
  ["eagle", "🦅", "bird america"],
  ["owl", "🦉", "bird wise"],
  ["bat", "🦇", "animal vampire"],
  ["wolf", "🐺", "animal"],
  ["boar", "🐗", "animal pig"],
  ["horse", "🐴", "animal"],
  ["unicorn", "🦄", "magic fantasy"],
  ["honeybee", "🐝", "bee insect"],
  ["bug", "🐛", "insect"],
  ["butterfly", "🦋", "insect"],
  ["snail", "🐌", "slow"],
  ["shell", "🐚", "beach sea"],
  ["beetle", "🐞", "insect ladybug"],
  ["ant", "🐜", "insect"],
  ["spider", "🕷️", "insect web"],
  ["spider_web", "🕸️", "web"],
  ["turtle", "🐢", "animal slow"],
  ["snake", "🐍", "animal"],
  ["lizard", "🦎", "animal reptile"],
  ["scorpion", "🦂", "animal"],
  ["crab", "🦀", "animal seafood"],
  ["shrimp", "🦐", "seafood"],
  ["squid", "🦑", "seafood octopus"],
  ["octopus", "🐙", "animal sea"],
  ["lobster", "🦞", "seafood"],
  ["fish", "🐟", "animal sea"],
  ["tropical_fish", "🐠", "animal sea"],
  ["blowfish", "🐡", "animal fish"],
  ["shark", "🦈", "animal sea"],
  ["whale", "🐳", "animal sea"],
  ["whale2", "🐋", "animal sea"],
  ["dolphin", "🐬", "animal sea"],
  ["crocodile", "🐊", "animal"],
  ["leopard", "🐆", "animal cat"],
  ["tiger2", "🐅", "animal cat"],
  ["elephant", "🐘", "animal"],
  ["gorilla", "🦍", "animal ape"],
  ["deer", "🦌", "animal"],
  ["camel", "🐪", "animal desert"],
  ["giraffe", "🦒", "animal tall"],
  ["kangaroo", "🦘", "animal australia"],
  ["sloth", "🦥", "animal slow lazy"],
  ["hedgehog", "🦔", "animal"],
  ["dinosaur", "🦕", "animal extinct"],
  ["t_rex", "🦖", "dinosaur animal"],
  ["dragon", "🐉", "fantasy"],
  ["dragon_face", "🐲", "fantasy"],

  // Plants & Flowers
  ["bouquet", "💐", "flowers"],
  ["cherry_blossom", "🌸", "flower spring"],
  ["white_flower", "💮", "flower"],
  ["rosette", "🏵️", "flower"],
  ["rose", "🌹", "flower love"],
  ["wilted_flower", "🥀", "dead sad"],
  ["hibiscus", "🌺", "flower tropical"],
  ["sunflower", "🌻", "flower"],
  ["blossom", "🌼", "flower"],
  ["tulip", "🌷", "flower spring"],
  ["seedling", "🌱", "plant grow"],
  ["evergreen_tree", "🌲", "tree nature"],
  ["deciduous_tree", "🌳", "tree nature"],
  ["palm_tree", "🌴", "tree tropical vacation"],
  ["cactus", "🌵", "plant desert"],
  ["herb", "🌿", "plant leaf"],
  ["shamrock", "☘️", "luck irish"],
  ["four_leaf_clover", "🍀", "luck irish"],
  ["maple_leaf", "🍁", "fall autumn canada"],
  ["fallen_leaf", "🍂", "fall autumn"],
  ["leaves", "🍃", "nature wind"],
  ["mushroom", "🍄", "plant fungi"],

  // Activities & Objects
  ["soccer", "⚽", "football sport"],
  ["basketball", "🏀", "sport ball"],
  ["football", "🏈", "american sport"],
  ["baseball", "⚾", "sport ball"],
  ["tennis", "🎾", "sport ball"],
  ["volleyball", "🏐", "sport ball"],
  ["golf", "⛳", "sport"],
  ["8ball", "🎱", "pool billiards"],
  ["ping_pong", "🏓", "sport table tennis"],
  ["badminton", "🏸", "sport"],
  ["hockey", "🏒", "sport ice"],
  ["cricket_game", "🏏", "sport"],
  ["ski", "🎿", "snow winter sport"],
  ["snowboarder", "🏂", "snow winter sport"],
  ["ice_skate", "⛸️", "snow winter sport"],
  ["fishing_pole_and_fish", "🎣", "fishing"],
  ["dart", "🎯", "target bullseye"],
  ["bowling", "🎳", "sport"],
  ["video_game", "🎮", "game controller"],
  ["game_die", "🎲", "dice gambling"],
  ["jigsaw", "🧩", "puzzle"],
  ["chess_pawn", "♟️", "game"],
  ["performing_arts", "🎭", "theater drama"],
  ["art", "🎨", "paint palette"],
  ["guitar", "🎸", "music rock"],
  ["musical_keyboard", "🎹", "music piano"],
  ["saxophone", "🎷", "music jazz"],
  ["trumpet", "🎺", "music horn"],
  ["violin", "🎻", "music"],
  ["drum", "🥁", "music percussion"],
  ["microphone", "🎤", "music sing karaoke"],
  ["headphones", "🎧", "music audio"],
  ["radio", "📻", "music"],
  ["notes", "🎶", "music"],
  ["musical_note", "🎵", "music"],
  ["clapper", "🎬", "movie film"],
  ["movie_camera", "🎥", "film video"],
  ["camera", "📷", "photo picture"],
  ["camera_flash", "📸", "photo picture"],
  ["tv", "📺", "television"],
  ["computer", "💻", "laptop pc mac"],
  ["desktop_computer", "🖥️", "pc screen"],
  ["keyboard", "⌨️", "type"],
  ["mouse_computer", "🖱️", "click"],
  ["printer", "🖨️", "paper"],
  ["phone", "📱", "mobile cell"],
  ["telephone", "☎️", "call"],
  ["fax", "📠", "machine"],
  ["pager", "📟", "beeper"],
  ["battery", "🔋", "power energy"],
  ["electric_plug", "🔌", "power"],
  ["bulb", "💡", "idea light"],
  ["flashlight", "🔦", "light"],
  ["candle", "🕯️", "light"],
  ["wrench", "🔧", "tool fix"],
  ["hammer", "🔨", "tool build"],
  ["hammer_and_wrench", "🛠️", "tools fix"],
  ["screwdriver", "🪛", "tool fix"],
  ["nut_and_bolt", "🔩", "hardware"],
  ["gear", "⚙️", "settings cog"],
  ["chains", "⛓️", "link"],
  ["link", "🔗", "chain url"],
  ["scissors", "✂️", "cut"],
  ["paperclip", "📎", "attach"],
  ["paperclips", "🖇️", "attach"],
  ["pushpin", "📌", "pin location"],
  ["round_pushpin", "📍", "pin location"],
  ["triangular_ruler", "📐", "measure"],
  ["straight_ruler", "📏", "measure"],
  ["pen", "🖊️", "write"],
  ["fountain_pen", "🖋️", "write"],
  ["pencil", "✏️", "write draw"],
  ["crayon", "🖍️", "draw color"],
  ["memo", "📝", "note write"],
  ["briefcase", "💼", "work business"],
  ["file_folder", "📁", "directory"],
  ["open_file_folder", "📂", "directory"],
  ["clipboard", "📋", "paste"],
  ["calendar", "📆", "date schedule"],
  ["date", "📅", "calendar schedule"],
  ["card_index", "📇", "contacts"],
  ["chart_with_upwards_trend", "📈", "graph increase"],
  ["chart_with_downwards_trend", "📉", "graph decrease"],
  ["bar_chart", "📊", "graph stats"],
  ["books", "📚", "read study library"],
  ["book", "📖", "read"],
  ["closed_book", "📕", "read"],
  ["green_book", "📗", "read"],
  ["blue_book", "📘", "read"],
  ["orange_book", "📙", "read"],
  ["notebook", "📓", "journal"],
  ["notebook_with_decorative_cover", "📔", "journal"],
  ["ledger", "📒", "accounting"],
  ["scroll", "📜", "document ancient"],
  ["page_facing_up", "📄", "document"],
  ["page_with_curl", "📃", "document"],
  ["newspaper", "📰", "news press"],
  ["bookmark_tabs", "📑", "mark"],
  ["bookmark", "🔖", "mark save"],
  ["label", "🏷️", "tag"],
  ["envelope", "✉️", "mail email"],
  ["email", "📧", "mail"],
  ["incoming_envelope", "📨", "mail receive"],
  ["envelope_with_arrow", "📩", "mail send"],
  ["outbox_tray", "📤", "mail send"],
  ["inbox_tray", "📥", "mail receive"],
  ["package", "📦", "box delivery"],
  ["mailbox", "📫", "mail"],
  ["mailbox_with_mail", "📬", "mail"],
  ["postbox", "📮", "mail"],
  ["hourglass", "⌛", "time wait"],
  ["hourglass_flowing_sand", "⏳", "time wait"],
  ["watch", "⌚", "time"],
  ["alarm_clock", "⏰", "time wake"],
  ["stopwatch", "⏱️", "time"],
  ["timer_clock", "⏲️", "time"],
  ["clock", "🕐", "time"],
  ["lock", "🔒", "secure password"],
  ["unlock", "🔓", "open"],
  ["lock_with_ink_pen", "🔏", "secure sign"],
  ["closed_lock_with_key", "🔐", "secure"],
  ["key", "🔑", "password access"],
  ["old_key", "🗝️", "vintage"],
  ["mag", "🔍", "search zoom left"],
  ["mag_right", "🔎", "search zoom right"],

  // Symbols
  ["heavy_check_mark", "✔️", "yes done"],
  ["white_check_mark", "✅", "yes done"],
  ["ballot_box_with_check", "☑️", "yes vote"],
  ["heavy_multiplication_x", "✖️", "no wrong"],
  ["x", "❌", "no wrong cancel"],
  ["negative_squared_cross_mark", "❎", "no"],
  ["heavy_plus_sign", "➕", "add plus"],
  ["heavy_minus_sign", "➖", "minus subtract"],
  ["heavy_division_sign", "➗", "divide"],
  ["curly_loop", "➰", "loop"],
  ["loop", "➿", "double loop"],
  ["question", "❓", "confused"],
  ["grey_question", "❔", "confused"],
  ["exclamation", "❗", "warning important"],
  ["grey_exclamation", "❕", "warning"],
  ["bangbang", "‼️", "surprise"],
  ["interrobang", "⁉️", "surprise confusion"],
  ["warning", "⚠️", "caution danger"],
  ["no_entry", "⛔", "stop forbidden"],
  ["no_entry_sign", "🚫", "forbidden banned"],
  ["o", "⭕", "circle"],
  ["no_good", "🙅", "no stop"],
  ["ok_woman", "🙆", "yes okay"],
  ["information_source", "ℹ️", "info help"],
  ["abc", "🔤", "letters alphabet"],
  ["abcd", "🔡", "lowercase alphabet"],
  ["capital_abcd", "🔠", "uppercase alphabet"],
  ["symbols", "🔣", "characters"],
  ["1234", "🔢", "numbers"],
  ["hash", "#️⃣", "pound number"],
  ["asterisk", "*️⃣", "star"],
  ["zero", "0️⃣", "number"],
  ["one", "1️⃣", "number"],
  ["two", "2️⃣", "number"],
  ["three", "3️⃣", "number"],
  ["four", "4️⃣", "number"],
  ["five", "5️⃣", "number"],
  ["six", "6️⃣", "number"],
  ["seven", "7️⃣", "number"],
  ["eight", "8️⃣", "number"],
  ["nine", "9️⃣", "number"],
  ["keycap_ten", "🔟", "number"],
  ["arrow_up", "⬆️", "direction"],
  ["arrow_down", "⬇️", "direction"],
  ["arrow_left", "⬅️", "direction"],
  ["arrow_right", "➡️", "direction"],
  ["arrow_upper_left", "↖️", "direction"],
  ["arrow_upper_right", "↗️", "direction"],
  ["arrow_lower_left", "↙️", "direction"],
  ["arrow_lower_right", "↘️", "direction"],
  ["left_right_arrow", "↔️", "direction"],
  ["arrow_up_down", "↕️", "direction"],
  ["arrows_counterclockwise", "🔄", "refresh reload sync"],
  ["arrow_backward", "◀️", "rewind back"],
  ["arrow_forward", "▶️", "play forward"],
  ["fast_forward", "⏩", "speed"],
  ["rewind", "⏪", "back"],
  ["arrow_double_up", "⏫", "fast up"],
  ["arrow_double_down", "⏬", "fast down"],
  ["twisted_rightwards_arrows", "🔀", "shuffle random"],
  ["repeat", "🔁", "loop"],
  ["repeat_one", "🔂", "loop once"],
  ["recycle", "♻️", "environment green"],
  ["tm", "™️", "trademark"],
  ["copyright", "©️", "ip"],
  ["registered", "®️", "ip"],
  ["dollar", "💲", "money"],
  ["yen", "💴", "money japan"],
  ["euro", "💶", "money europe"],
  ["pound", "💷", "money uk"],
  ["moneybag", "💰", "money rich"],
  ["credit_card", "💳", "payment"],
  ["money_with_wings", "💸", "payment spending"],

  // Travel & Places
  ["rocket", "🚀", "space launch startup"],
  ["airplane", "✈️", "travel fly"],
  ["helicopter", "🚁", "fly"],
  ["car", "🚗", "vehicle auto"],
  ["taxi", "🚕", "car vehicle"],
  ["bus", "🚌", "vehicle transport"],
  ["ambulance", "🚑", "emergency medical"],
  ["fire_engine", "🚒", "emergency"],
  ["police_car", "🚓", "emergency law"],
  ["truck", "🚚", "delivery vehicle"],
  ["tractor", "🚜", "farm vehicle"],
  ["bike", "🚲", "bicycle cycling"],
  ["motor_scooter", "🛵", "vespa moped"],
  ["motorcycle", "🏍️", "bike"],
  ["train", "🚆", "rail transport"],
  ["metro", "🚇", "subway underground"],
  ["ship", "🚢", "boat cruise"],
  ["speedboat", "🚤", "boat"],
  ["sailboat", "⛵", "boat sailing"],
  ["anchor", "⚓", "ship boat"],
  ["construction", "🚧", "warning work"],
  ["vertical_traffic_light", "🚦", "road signal"],
  ["traffic_light", "🚥", "road signal"],
  ["fuelpump", "⛽", "gas station"],
  ["busstop", "🚏", "transport"],
  ["world_map", "🗺️", "travel"],
  ["statue_of_liberty", "🗽", "america new york"],
  ["moyai", "🗿", "easter island"],
  ["house", "🏠", "home"],
  ["house_with_garden", "🏡", "home"],
  ["office", "🏢", "building work"],
  ["factory", "🏭", "building industry"],
  ["post_office", "🏣", "building mail"],
  ["hospital", "🏥", "building medical"],
  ["bank", "🏦", "building money"],
  ["hotel", "🏨", "building sleep"],
  ["school", "🏫", "building education"],
  ["church", "⛪", "building religion"],
  ["mosque", "🕌", "building religion"],
  ["synagogue", "🕍", "building religion"],
  ["stadium", "🏟️", "building sports"],
  ["tent", "⛺", "camping outdoor"],
  ["camping", "🏕️", "outdoor tent"],
  ["beach_umbrella", "🏖️", "vacation summer"],
  ["desert", "🏜️", "sand dry"],
  ["mountain", "⛰️", "nature"],
  ["snow_capped_mountain", "🏔️", "nature"],
  ["volcano", "🌋", "nature eruption"],
  ["earth_africa", "🌍", "world globe"],
  ["earth_americas", "🌎", "world globe"],
  ["earth_asia", "🌏", "world globe"],
  ["globe_with_meridians", "🌐", "world internet"],
  ["crescent_moon", "🌙", "night"],
  ["full_moon", "🌕", "night"],
  ["new_moon", "🌑", "night"],
  ["sun_with_face", "🌞", "day"],
  ["full_moon_with_face", "🌝", "night"],
  ["new_moon_with_face", "🌚", "night"],
  ["comet", "☄️", "space"],
  ["milky_way", "🌌", "space galaxy"],

  // Flags
  ["checkered_flag", "🏁", "race finish"],
  ["triangular_flag_on_post", "🚩", "flag red"],
  ["crossed_flags", "🎌", "japan celebration"],
  ["black_flag", "🏴", "flag"],
  ["white_flag", "🏳️", "surrender peace"],
  ["rainbow_flag", "🏳️‍🌈", "pride lgbtq"],
  ["pirate_flag", "🏴‍☠️", "jolly roger skull"],

  // Misc
  ["trophy", "🏆", "winner award"],
  ["medal_sports", "🏅", "winner award"],
  ["medal_military", "🎖️", "award"],
  ["first_place_medal", "🥇", "winner gold"],
  ["second_place_medal", "🥈", "silver"],
  ["third_place_medal", "🥉", "bronze"],
  ["crown", "👑", "king queen royal"],
  ["gem", "💎", "diamond jewel"],
  ["ring", "💍", "wedding engagement"],
  ["lipstick", "💄", "makeup beauty"],
  ["dress", "👗", "clothes fashion"],
  ["tshirt", "👕", "clothes"],
  ["jeans", "👖", "clothes pants"],
  ["scarf", "🧣", "clothes winter"],
  ["gloves", "🧤", "clothes winter"],
  ["coat", "🧥", "clothes winter"],
  ["socks", "🧦", "clothes"],
  ["kimono", "👘", "clothes japan"],
  ["bikini", "👙", "clothes swim"],
  ["womans_clothes", "👚", "clothes"],
  ["purse", "👛", "bag money"],
  ["handbag", "👜", "bag fashion"],
  ["pouch", "👝", "bag"],
  ["shopping_bags", "🛍️", "buy retail"],
  ["school_satchel", "🎒", "backpack bag"],
  ["mans_shoe", "👞", "clothes"],
  ["athletic_shoe", "👟", "sneaker running"],
  ["hiking_boot", "🥾", "shoe outdoor"],
  ["womans_flat_shoe", "🥿", "shoe"],
  ["high_heel", "👠", "shoe"],
  ["sandal", "👡", "shoe"],
  ["boot", "👢", "shoe"],
  ["tophat", "🎩", "fancy gentleman"],
  ["billed_cap", "🧢", "hat baseball"],
  ["mortar_board", "🎓", "graduation school"],
  ["rescue_worker_helmet", "⛑️", "safety"],
  ["prayer_beads", "📿", "religion"],
  ["nazar_amulet", "🧿", "protection evil eye"],
  ["sunglasses", "🕶️", "cool summer"],
  ["eyeglasses", "👓", "glasses nerd"],
  ["goggles", "🥽", "safety swim"],
  ["test_tube", "🧪", "science experiment"],
  ["petri_dish", "🧫", "science biology"],
  ["dna", "🧬", "science genetics"],
  ["microscope", "🔬", "science"],
  ["telescope", "🔭", "science space"],
  ["satellite", "📡", "signal space"],
  ["syringe", "💉", "medical vaccine"],
  ["pill", "💊", "medicine drug"],
  ["stethoscope", "🩺", "medical doctor"],
  ["adhesive_bandage", "🩹", "medical bandaid"],
  ["drop_of_blood", "🩸", "medical"],
  ["dagger", "🗡️", "knife sword"],
  ["crossed_swords", "⚔️", "battle fight"],
  ["shield", "🛡️", "defense protect"],
  ["bow_and_arrow", "🏹", "archery"],
  ["axe", "🪓", "tool weapon"],
  ["gun", "🔫", "weapon pistol"],
  ["crystal_ball", "🔮", "magic fortune"],
  ["magic_wand", "🪄", "wizard"],
  ["joystick", "🕹️", "game arcade"],
  ["teddy_bear", "🧸", "toy stuffed"],
  ["pinata", "🪅", "party celebration"],
  ["nesting_dolls", "🪆", "russian matryoshka"],
  ["balloon", "🎈", "party birthday"],
  ["tada", "🎉", "party celebration congratulations"],
  ["confetti_ball", "🎊", "party celebration"],
  ["ribbon", "🎀", "gift decoration"],
  ["gift", "🎁", "present birthday christmas"],
  ["christmas_tree", "🎄", "holiday decoration"],
  ["jack_o_lantern", "🎃", "halloween pumpkin"],
  ["firecracker", "🧨", "celebration explosion"],
  ["sparkler", "🎇", "fireworks celebration"]
]

export default class extends Controller {
  static targets = [
    "dialog",
    "input",
    "grid",
    "preview"
  ]

  static values = {
    columns: { type: Number, default: 10 }
  }

  connect() {
    this.allEmojis = EMOJI_DATA
    this.filteredEmojis = [...this.allEmojis]
    this.selectedIndex = 0
  }

  // Open the emoji picker dialog
  open() {
    this.filteredEmojis = [...this.allEmojis]
    this.selectedIndex = 0

    this.inputTarget.value = ""
    this.renderGrid()
    this.updatePreview()
    this.dialogTarget.showModal()
    this.inputTarget.focus()
  }

  // Close the dialog
  close() {
    this.dialogTarget.close()
  }

  // Handle search input
  onInput() {
    const query = this.inputTarget.value.trim().toLowerCase()

    if (!query) {
      this.filteredEmojis = [...this.allEmojis]
    } else {
      // Search in shortcode and keywords
      this.filteredEmojis = this.allEmojis.filter(([shortcode, , keywords]) => {
        const searchText = `${shortcode} ${keywords}`.toLowerCase()
        return query.split(/\s+/).every(term => searchText.includes(term))
      })
    }

    this.selectedIndex = 0
    this.renderGrid()
    this.updatePreview()
  }

  // Render the emoji grid
  renderGrid() {
    if (this.filteredEmojis.length === 0) {
      this.gridTarget.innerHTML = `
        <div class="col-span-full px-3 py-6 text-center text-[var(--theme-text-muted)] text-sm">
          ${window.t ? window.t("status.no_matches") : "No matches found"}
        </div>
      `
      return
    }

    this.gridTarget.innerHTML = this.filteredEmojis
      .map(([shortcode, emoji], index) => {
        const isSelected = index === this.selectedIndex
        return `
          <button
            type="button"
            class="w-10 h-10 flex items-center justify-center text-2xl rounded hover:bg-[var(--theme-bg-hover)] transition-colors ${
              isSelected ? 'bg-[var(--theme-accent)] ring-2 ring-[var(--theme-accent)] ring-offset-1 ring-offset-[var(--theme-bg-secondary)]' : ''
            }"
            data-index="${index}"
            data-shortcode="${escapeHtml(shortcode)}"
            data-emoji="${escapeHtml(emoji)}"
            data-action="click->emoji-picker#selectFromClick mouseenter->emoji-picker#onHover"
            title=":${escapeHtml(shortcode)}:"
          >${emoji}</button>
        `
      })
      .join("")

    // Scroll selected item into view
    this.scrollSelectedIntoView()
  }

  // Scroll the selected emoji into view
  scrollSelectedIntoView() {
    const selectedButton = this.gridTarget.querySelector(`[data-index="${this.selectedIndex}"]`)
    if (selectedButton) {
      selectedButton.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }
  }

  // Update the preview area with selected emoji info
  updatePreview() {
    if (this.filteredEmojis.length === 0 || !this.hasPreviewTarget) {
      if (this.hasPreviewTarget) {
        this.previewTarget.innerHTML = ""
      }
      return
    }

    const [shortcode, emoji] = this.filteredEmojis[this.selectedIndex] || []
    if (!shortcode) return

    this.previewTarget.innerHTML = `
      <span class="text-4xl">${emoji}</span>
      <code class="text-sm bg-[var(--theme-bg-tertiary)] px-2 py-1 rounded">:${escapeHtml(shortcode)}:</code>
    `
  }

  // Handle keyboard navigation
  onKeydown(event) {
    const cols = this.columnsValue
    const total = this.filteredEmojis.length

    if (total === 0) return

    switch (event.key) {
      case "ArrowRight":
        event.preventDefault()
        this.selectedIndex = (this.selectedIndex + 1) % total
        this.renderGrid()
        this.updatePreview()
        break

      case "ArrowLeft":
        event.preventDefault()
        this.selectedIndex = (this.selectedIndex - 1 + total) % total
        this.renderGrid()
        this.updatePreview()
        break

      case "ArrowDown":
        event.preventDefault()
        const nextRow = this.selectedIndex + cols
        if (nextRow < total) {
          this.selectedIndex = nextRow
        } else {
          // Wrap to first row, same column or last item
          const col = this.selectedIndex % cols
          this.selectedIndex = Math.min(col, total - 1)
        }
        this.renderGrid()
        this.updatePreview()
        break

      case "ArrowUp":
        event.preventDefault()
        const prevRow = this.selectedIndex - cols
        if (prevRow >= 0) {
          this.selectedIndex = prevRow
        } else {
          // Wrap to last row, same column or last item
          const col = this.selectedIndex % cols
          const lastRowStart = Math.floor((total - 1) / cols) * cols
          this.selectedIndex = Math.min(lastRowStart + col, total - 1)
        }
        this.renderGrid()
        this.updatePreview()
        break

      case "Enter":
        event.preventDefault()
        this.selectCurrent()
        break

      case "Escape":
        // Let dialog handle escape
        break
    }
  }

  // Handle mouse hover on emoji
  onHover(event) {
    const index = parseInt(event.currentTarget.dataset.index, 10)
    if (!isNaN(index) && index !== this.selectedIndex) {
      this.selectedIndex = index
      this.renderGrid()
      this.updatePreview()
    }
  }

  // Handle click on emoji
  selectFromClick(event) {
    const shortcode = event.currentTarget.dataset.shortcode
    if (shortcode) {
      this.dispatchSelected(shortcode)
    }
  }

  // Select current emoji
  selectCurrent() {
    if (this.filteredEmojis.length === 0) return

    const [shortcode] = this.filteredEmojis[this.selectedIndex] || []
    if (shortcode) {
      this.dispatchSelected(shortcode)
    }
  }

  // Dispatch selection event and close
  dispatchSelected(shortcode) {
    this.dispatch("selected", {
      detail: { shortcode, markdown: `:${shortcode}:` }
    })
    this.close()
  }
}
