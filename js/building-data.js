/* ==========================================
   皇城·万象 · 建筑数据
   （由 data/buildings.json 提供，JS 端读取）
   ========================================== */

// 导出默认数据，供 archive.js 在 fetch 失败时使用
// 实际数据请参考 data/buildings.json
const BUILDING_DATA = {
  // 20座建筑的数据结构参考：
  // {
  //   id: string,           // 唯一ID
  //   name_zh: string,       // 中文名
  //   name_en: string,       // 英文名
  //   pinyin: string,        // 拼音
  //   area_zh: string,       // 区域
  //   area_en: string,
  //   function_zh: string,  // 功能
  //   function_en: string,
  //   rank_zh: string,       // 等级
  //   rank_en: string,
  //   roof_zh: string,      // 屋顶形制
  //   roof_en: string,
  //   built_zh: string,     // 建造年代
  //   built_en: string,
  //   material_zh: string,   // 材料来源
  //   material_en: string,
  //   trivia_zh: string,     // 趣闻
  //   trivia_en: string,
  //   events: Array<{title_zh, title_en, desc_zh, desc_en}>,
  //   images: string[],       // 图片路径数组
  //   map_position: { x: string, y: string }, // 在地图上的百分比位置
  //   featured: boolean,      // 是否为重点建筑（显示★标记）
  //   detail_page: string | null // 模块二对应页面路径
  // }
};
