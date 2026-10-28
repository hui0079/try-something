/**
 * Map short WeChat captions to exaggerated pose/expression directions.
 */
const CAPTION_EXPRESSIONS: Record<string, string> = {
  好的:
    "大幅度向前点头鞠躬，右手把大拇指举到脸颊旁边晃一晃，眼睛眯成一条缝，嘴巴咧得很大",
  不行:
    "双手在脸前交叉成大大的X，头左右用力摇，身体明显后仰躲开，眉头拧成一团",
  无语:
    "双手摊开举到与肩同高，眼球翻到上方只剩眼白，头歪向一边，一只脚点地重心不稳",
  加油:
    "双拳举过头顶上下挥舞，身体做成弓步往前冲，嘴巴张大像在喊，眼神发亮",
  哭哭:
    "整个人蹲下来，双手捂住脸，眼泪大颗往下掉，肩膀一抽一抽地抖",
  爱你:
    "双手在脸前比出一个比头还大的爱心，身体左右摇摆，脸颊通红，送出一个飞吻",
  在忙:
    "一边小跑一边把电话夹在肩上，另一只手抱着一摞摇摇晃晃的文件，汗珠飞溅",
  哈哈哈:
    "仰头捧腹大笑，一只手用力拍大腿，身体前后晃到几乎蹲下去，笑出眼泪",
  谢谢:
    "腰弯到接近九十度深深鞠躬，然后双手合十举到胸前，眼睛笑着闭上",
  收到:
    "单手举到额头用力敬礼，另一只手竖起大拇指，脚跟并拢站得笔直",
  晚安:
    "抱着枕头歪头打一个很大的哈欠，眼皮快合上，身体慢慢往下坐",
  早安:
    "双臂高高伸懒腰，然后用力挥手打招呼，身体蹦一下，精神十足",
};

/** Negative prompt for expression variants (text-to-image). */
export const EXPRESSION_NEGATIVE_PROMPT = [
  "文字",
  "字幕",
  "水印",
  "复杂背景",
  "风景背景",
  "室内场景",
  "换人",
  "换装",
  "面无表情站立",
  "双手自然下垂静止站着",
  "动作幅度太小",
  "多人",
  "低清晰度",
  "畸形",
  "多余肢体",
].join("，");

/** Negative prompt for expression GIFs: keep the character, kill dark scenes. */
export const MOTION_NEGATIVE_PROMPT = [
  "黑色背景",
  "暗背景",
  "灰色背景",
  "夜景",
  "暗角",
  "大面积阴影",
  "渐变背景",
  "室内场景",
  "风景",
  "换脸",
  "换装",
  "文字",
  "字幕",
  "水印",
  "镜头猛晃",
  "静止站立",
  "动作幅度很小",
].join("，");

/** Motion prompt for image-to-video. Face/clothes stay; pose must change. */
export function buildMotionPrompt(caption: string): string {
  const action = expressionActionForCaption(caption);
  return [
    "只保留首帧角色的脸型、五官、服装和配色，不要换人",
    "姿势必须和首帧明显不同，做成夸张、一眼能看懂的表情包动作",
    action,
    "背景必须是均匀的纯白亮底，像摄影棚白墙，不要渐变、不要阴影、不要暗角",
    "动作适合循环播放，画面里不要出现文字和水印",
  ].join("。");
}

export function expressionActionForCaption(caption: string): string {
  const key = caption.trim();
  return (
    CAPTION_EXPRESSIONS[key] ??
    `做出能表达「${key}」的夸张表情和全身肢体动作，一眼能看懂`
  );
}

/**
 * Lock appearance via the user's character description (text),
 * then force a clear pose/expression — avoids ref_img strength tug-of-war.
 */
export function buildExpressionPrompt(
  caption: string,
  characterDescription: string,
): string {
  const action = expressionActionForCaption(caption);
  const character =
    characterDescription.trim() || "可爱卡通表情包角色，外形稳定统一";
  return [
    `角色设定（外貌服装必须一致）：${character}`,
    "画风：微信表情包可爱卡通贴纸，单一角色居中，纯白色背景，无文字无水印",
    `本张必须做出的动作表情：${action}`,
    "面部表情和手脚姿势都要明显体现上述动作，动作夸张清晰",
  ].join("。");
}

/** Stable-ish seed so one character pack drifts less across variants. */
export function seedFromCharacterPrompt(characterDescription: string): number {
  const text = characterDescription.trim() || "sticker";
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash % 2147483647;
}
