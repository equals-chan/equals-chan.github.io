// Language support: zh-CN (default data), zh-TW, en.
// Pick order: ?lang= in the URL, then the "lang" cookie, then the browser language.
const LANGS = ["zh-CN","zh-TW","en"]

function detectLang(){
    var norm = function(l){
        if(!l){return null}
        l = l.toLowerCase()
        if(l == "zh-tw" || l == "zh-hk" || l == "zh-mo" || l.startsWith("zh-hant") || l == "tw"){return "zh-TW"}
        if(l.startsWith("zh") || l == "cn"){return "zh-CN"}
        if(l.startsWith("en")){return "en"}
        return null
    }
    var p = norm(new URLSearchParams(location.search).get("lang"))
    if(p){return p}
    var m = document.cookie.match(/(?:^|; )lang=([^;]*)/)
    var c = norm(m ? decodeURIComponent(m[1]) : null)
    if(c){return c}
    var langs = navigator.languages || [navigator.language]
    for(var i = 0; i < langs.length; i++){
        var n = norm(langs[i])
        if(n){return n}
    }
    return "zh-CN"
}

var lang = detectLang()
document.documentElement.lang = lang

const ghost_data_url = {
    "zh-CN": "backup-data/ghosts_backup.json",
    "zh-TW": "backup-data/ghosts_zh-TW.json",
    "en": "backup-data/ghosts_en.json",
}[lang] + "?v=20261022"

const EVI_NAMES = {
    "zh-CN": {
        "EMF 5": "EMF 5级",
        "DOTs": "点阵投影仪",
        "Fingerprints": "紫外线",
        "Freezing": "刺骨寒温",
        "Ghost Orbs": "灵球",
        "Writing": "鬼魂笔迹",
        "Spirit Box": "通灵盒"
    },
    "en": {
        "EMF 5": "EMF 5",
        "DOTs": "D.O.T.S",
        "Fingerprints": "Ultraviolet",
        "Freezing": "Freezing",
        "Ghost Orbs": "Ghost Orbs",
        "Writing": "Ghost Writing",
        "Spirit Box": "Spirit Box"
    },
    "zh-TW": {
        "EMF 5": "EMF 5級",
        "DOTs": "點陣投影儀",
        "Fingerprints": "紫外線",
        "Freezing": "刺骨寒溫",
        "Ghost Orbs": "靈球",
        "Writing": "鬼魂筆跡",
        "Spirit Box": "通靈盒"
    }
}
var evi_name = EVI_NAMES[lang]

const UI_TEXT = {
    "恐鬼症助手": {
        "zh-TW": "恐鬼症助手",
        "en": "Phasmophobia Helper"
    },
    "设置": {
        "zh-TW": "設定",
        "en": "Settings"
    },
    "音量": {
        "zh-TW": "音量",
        "en": "Volume"
    },
    "(改变脚步音量)": {
        "zh-TW": "(改變腳步音量)",
        "en": "(footstep volume)"
    },
    "速度补偿": {
        "zh-TW": "速度補償",
        "en": "Speed Offset"
    },
    "(调整脚步速度)": {
        "zh-TW": "(調整腳步速度)",
        "en": "(adjust footstep speed)"
    },
    "速度滤波器逻辑": {
        "zh-TW": "速度濾波器邏輯",
        "en": "Speed Filter Logic"
    },
    "教学": {
        "zh-TW": "教學",
        "en": "Wiki"
    },
    "地图": {
        "zh-TW": "地圖",
        "en": "Maps"
    },
    "证据": {
        "zh-TW": "證據",
        "en": "Evidence"
    },
    "速度": {
        "zh-TW": "速度",
        "en": "Speed"
    },
    "慢速": {
        "zh-TW": "慢速",
        "en": "Slow"
    },
    "常速": {
        "zh-TW": "常速",
        "en": "Normal"
    },
    "快速": {
        "zh-TW": "快速",
        "en": "Fast"
    },
    "工具": {
        "zh-TW": "工具",
        "en": "Tools"
    },
    "鬼魂速度": {
        "zh-TW": "鬼魂速度",
        "en": "Ghost Speed"
    },
    "(点击 🔊 来听速度)": {
        "zh-TW": "(點選 🔊 來聽速度)",
        "en": "(click 🔊 to hear the speed)"
    },
    "圣木倒计时": {
        "zh-TW": "聖木倒計時",
        "en": "Smudge Timer"
    },
    "魂魄": {
        "zh-TW": "魂魄",
        "en": "Spirit"
    },
    "恶魔": {
        "zh-TW": "惡魔",
        "en": "Demon"
    },
    "(按 'T' 启停)": {
        "zh-TW": "(按 'T' 啟停)",
        "en": "(press 'T' to start / stop)"
    },
    "根据点击频率定鬼": {
        "zh-TW": "根據點選頻率定鬼",
        "en": "Tap to Find Speed"
    },
    "点击": {
        "zh-TW": "點選",
        "en": "Tap"
    },
    "(或按 'F')": {
        "zh-TW": "(或按 'F')",
        "en": "(or press 'F')"
    },
    "(按 'R' 重置)": {
        "zh-TW": "(按 'R' 重置)",
        "en": "(press 'R' to reset)"
    },
    "本站总访问量": {
        "zh-TW": "本站總訪問量",
        "en": "Total visits "
    },
    "次": {
        "zh-TW": "次",
        "en": ""
    },
    "· 数据": {
        "zh-TW": "· 資料",
        "en": "· Data"
    },
    "信息有误？ / 交流QQ群（887268859）": {
        "zh-TW": "資訊有誤？ / 交流QQ群（887268859）",
        "en": "Wrong info? / QQ group (887268859)"
    },
    "重置": {
        "zh-TW": "重置",
        "en": "Reset"
    },
    "个证据": {
        "zh-TW": "個證據",
        "en": "evidence"
    },
    "天启": {
        "zh-TW": "天啟",
        "en": "Apocalypse"
    },
    "疯狂": {
        "zh-TW": "瘋狂",
        "en": "Insanity"
    },
    "噩梦": {
        "zh-TW": "噩夢",
        "en": "Nightmare"
    },
    "专家": {
        "zh-TW": "專家",
        "en": "Professional"
    },
    "猎杀": {
        "zh-TW": "獵殺",
        "en": "Hunts"
    },
    "闪烁": {
        "zh-TW": "閃爍",
        "en": "Flicker"
    },
    "在猎杀过程中，鬼魂会忽隐忽现，每隔几秒就会在可见和不可见之间交替多次。在狩猎过程中，有几种鬼可以通过它们的闪烁来识别:(1)在狩猎过程中，赤鬼会更明显;(2)幻影会在更长的时间内不可见。": {
        "zh-TW": "在獵殺過程中，鬼魂會忽隱忽現，每隔幾秒就會在可見和不可見之間交替多次。在狩獵過程中，有幾種鬼可以通過它們的閃爍來識別:(1)在狩獵過程中，赤鬼會更明顯;(2)幻影會在更長的時間內不可見。",
        "en": "During a hunt the ghost flickers, switching between visible and invisible several times every few seconds. Some ghosts can be identified by their flicker: (1) the Oni is more visible during hunts; (2) the Phantom stays invisible for longer."
    },
    "下面你可以看到幻影，赤鬼，和所有其他鬼的闪烁时间的例子。": {
        "zh-TW": "下面你可以看到幻影，赤鬼，和所有其他鬼的閃爍時間的例子。",
        "en": "Below are examples of the flicker timing for the Phantom, the Oni, and every other ghost."
    },
    "幻影": {
        "zh-TW": "幻影",
        "en": "Phantom"
    },
    "正常": {
        "zh-TW": "正常",
        "en": "Normal"
    },
    "赤鬼": {
        "zh-TW": "赤鬼",
        "en": "Oni"
    },
    "猴爪": {
        "zh-TW": "猴爪",
        "en": "Monkey Paw"
    },
    "通灵板": {
        "zh-TW": "通靈板",
        "en": "Ouija Board"
    }
}

function t(s){
    if(lang == "zh-CN" || !UI_TEXT.hasOwnProperty(s)){return s}
    return UI_TEXT[s][lang]
}

// Swap every text node whose trimmed text is a known Simplified string.
function translatePage(root){
    if(lang == "zh-CN"){return}
    document.title = t(document.title)
    var walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT)
    var node
    while((node = walker.nextNode())){
        var raw = node.nodeValue
        var key = raw.trim()
        if(key && UI_TEXT.hasOwnProperty(key)){
            node.nodeValue = raw.replace(key, UI_TEXT[key][lang])
        }
    }
}

function setLang(l){
    document.cookie = "lang=" + l + ";max-age=" + (365*86400) + ";path=/"
    var url = new URL(location.href)
    url.searchParams.delete("lang")
    location.href = url.toString()
}

function renderLangSwitch(){
    var box = document.getElementById("lang_switch")
    if(!box){return}
    box.querySelectorAll("[data-lang]").forEach(function(a){
        if(a.dataset.lang == lang){a.classList.add("active")}
        a.onclick = function(){ if(a.dataset.lang != lang){setLang(a.dataset.lang)} }
    })
}

document.addEventListener("DOMContentLoaded", function(){
    translatePage(document.body)
    renderLangSwitch()
})
