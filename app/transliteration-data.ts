export const INITIAL_GROUPS = [
  { key: "zero", label: "∅", aliases: [""] },
  { key: "n", label: "n", aliases: ["n"] },
  { key: "bp", label: "b, p", aliases: ["b", "p"] },
  { key: "qxg", label: "q, x, γ", aliases: ["q", "x", "γ"] },
  { key: "k", label: "k", aliases: ["k"] },
  { key: "g", label: "g", aliases: ["g"] },
  { key: "m", label: "m", aliases: ["m"] },
  { key: "l", label: "l", aliases: ["l"] },
  { key: "s", label: "s", aliases: ["s"] },
  { key: "sh", label: "š", aliases: ["š"] },
  { key: "t", label: "t", aliases: ["t"] },
  { key: "d", label: "d", aliases: ["d"] },
  { key: "ch", label: "č", aliases: ["č"] },
  { key: "j", label: "ǰ", aliases: ["ǰ"] },
  { key: "y", label: "y", aliases: ["y"] },
] as const;

type RawRhymeRow = {
  label: string;
  variants: string[];
  cells: string[];
};

const RAW_RHYME_ROWS: RawRhymeRow[] = [
  { label: "a", variants: ["a"], cells: ["阿", "納", "拔巴罷把", "合哈花", "客", "格", "馬", "剌", "撒", "沙", "塔塌", "怛答", "察", "札", "牙迓"] },
  { label: "ai, ei", variants: ["ai", "ei"], cells: ["埃", "乃", "伯白", "孩海", "克", "該", "埋", "來", "賽", "篩", "臺泰", "歹德", "", "齋澤", ""] },
  { label: "am", variants: ["am"], cells: ["俺", "南", "", "含", "", "敢甘", "", "藍", "三毿", "", "談探", "", "攙", "站", "黯"] },
  { label: "an", variants: ["an"], cells: ["安", "難", "班", "罕", "刊", "干", "蠻", "闌蘭", "三散", "", "壇", "丹", "潺", "盞淺", "顏"] },
  { label: "ang", variants: ["ang"], cells: ["昂", "", "邦", "慷杭", "康", "", "莽忙", "郎", "桑倉", "", "唐堂儻", "當", "敞昌", "掌", "羊楊揚"] },
  { label: "au, eü", variants: ["au", "eü"], cells: ["", "耨", "鴇保", "", "", "鉤", "卯", "老䳓", "掃嘯", "", "討挑", "倒擣", "超抄潮", "沼", ""] },
  { label: "e, ē", variants: ["e", "ē"], cells: ["額", "捏", "別", "赫協", "客", "格", "蔑", "列", "薛", "", "帖驖鐵", "迭咥", "扯徹", "者哲", "也耶"] },
  { label: "em", variants: ["em"], cells: ["奄", "粘", "", "含", "砍坎龕弇", "兼", "", "", "撏", "", "添忝", "", "", "詹呫", ""] },
  { label: "en", variants: ["en"], cells: ["延", "年", "邊", "", "刊虔", "堅", "綿", "連", "先", "", "田闐", "顛", "禪纏", "氊氈", "顏"] },
  { label: "eng", variants: ["eng"], cells: ["昂", "能", "邦", "", "", "", "", "涼良", "相僧襄", "", "騰", "登", "長", "", ""] },
  { label: "i, ii", variants: ["i", "ii"], cells: ["亦", "你泥", "必畢", "希喜蟢", "乞", "吉汲", "米", "理里黎", "昔", "食失石拭釋濕", "", "的", "赤", "只知", "也驛宜翼"] },
  { label: "im", variants: ["im"], cells: ["音", "", "", "", "欽", "", "", "林", "", "", "", "的音", "沉", "", "音"] },
  { label: "in", variants: ["in"], cells: ["引", "紉", "賓", "欣", "勤", "斤", "民敏", "鄰", "", "哂申", "", "丁", "臣沉", "真", "因"] },
  { label: "ing", variants: ["ing"], cells: ["影", "", "", "興", "輕", "京", "", "領", "", "升", "", "丁", "成丞", "整征", "影"] },
  { label: "o, ö", variants: ["o", "ö"], cells: ["斡濣", "那", "孛", "豁訶火", "可闊", "戈哥歌葛", "抹秣莫", "捋羅騾劣", "鎖莎雪", "", "脫", "朶多", "輟搠綽", "勺拙朮", "約"] },
  { label: "u, ü", variants: ["u", "ü"], cells: ["兀嗚䦍", "訥弩", "不卜步鏷", "忽許", "曲窟", "古詁", "木模", "魯騄祿", "速", "倏", "禿圖途突土", "都覩", "抽出除", "主周竹", "余禹由有月"] },
  { label: "oi, öi", variants: ["oi", "öi"], cells: ["", "", "", "槐", "", "", "", "", "", "率", "", "", "", "", ""] },
  { label: "ui, üi", variants: ["ui", "üi"], cells: ["為危委", "", "備", "灰", "恢", "貴癸歸", "梅", "雷", "遂", "", "推", "堆", "垂", "", ""] },
  { label: "om, öm", variants: ["om", "öm"], cells: ["穩", "", "", "豁木", "", "管", "", "藍", "", "", "屯", "敦", "", "", ""] },
  { label: "on, ön", variants: ["on", "ön"], cells: ["完", "", "", "桓洹", "款缺", "官", "", "欒", "旋", "", "團", "端", "", "", ""] },
  { label: "un, ün", variants: ["un", "ün"], cells: ["溫", "嫩", "奔", "渾", "坤", "昆琨裩", "門", "侖", "孫", "", "屯", "敦", "純", "諄", "云"] },
  { label: "ong, öng", variants: ["ong", "öng"], cells: ["汪翁", "", "", "荒晃", "匡", "", "莽忙", "郎籠", "莎汪", "", "", "董", "", "莊", ""] },
  { label: "ung, üng", variants: ["ung", "üng"], cells: ["翁", "農", "", "洪", "孔", "", "蒙", "籠", "", "", "統", "東", "充", "種冢中", ""] },
];

export const RHYME_ROWS = RAW_RHYME_ROWS.map((row) => ({
  label: row.label,
  variants: row.variants,
  cells: Object.fromEntries(
    INITIAL_GROUPS.map((initial, index) => [initial.key, row.cells[index] ?? ""]),
  ) as Record<(typeof INITIAL_GROUPS)[number]["key"], string>,
}));

export const SPECIAL_TRANSLATIONS = [
  { source: "niγu", options: ["紐"] },
  { source: "riang", options: ["良"] },
  { source: "wa", options: ["蛙", "洼"] },
  { source: "r", options: ["兒"] },
  { source: "morin", options: ["秣驎"] },
  { source: "burqan", options: ["不峏罕"] },
  { source: "taisi", options: ["太子"] },
  { source: "buyur", options: ["捕魚兒"] },
  { source: "naur", options: ["納浯兒"] },
  { source: "kölen", options: ["闊漣"] },
  { source: "müren", options: ["沐漣"] },
  { source: "aqta", options: ["阿黑騸"] },
  { source: "senggür", options: ["桑沽兒"] },
  { source: "ongqan", options: ["王罕"] },
  { source: "ongging čingseng", options: ["王京丞相"] },
  { source: "ölǰei", options: ["完者"] },
  { source: "tayang", options: ["塔陽"] },
  { source: "söndeivu", options: ["宣德府"] },
  { source: "qosivu", options: ["河西務"] },
  { source: "hindus", options: ["欣都思"] },
  { source: "tolui", options: ["拖雷"] },
  { source: "tamma", options: ["探馬"] },
  { source: "tonggon", options: ["潼關"] },
  { source: "senggüm", options: ["桑昆", "想昆"] },
  { source: "ǰeugon", options: ["趙官"] },
  { source: "gungǰü", options: ["公主"] },
  { source: "kimča'ud", options: ["欽察"] },
  { source: "ḳangli", options: ["康里"] },
  { source: "namging", options: ["南京"] },
] as const;

export const SOURCE_NOTE = "a 列與 qa、xa、γa 有時互相通用";
