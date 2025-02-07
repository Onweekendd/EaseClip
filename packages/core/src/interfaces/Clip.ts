import { BaseElement } from "../elements/BaseElement";

export interface Clip<T extends BaseElement> {
  /** @description  唯一标识 */
  id: string;

  /** @description 资源 */
  readonly resource: T;

  /** @description 名称 */
  name: string;

  /** @description 开始时间戳 */
  startTimestamp: number;

  /** @description 结束时间戳 */
  endTimestamp: number;

  type: "image" | "video" | "audio" | "text";
}
