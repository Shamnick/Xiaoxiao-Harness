/**
 * Host 侧入口。
 *
 * 侧栏品牌完全由 client 侧插槽承担，Host 侧不需要注册任何东西 ——
 * 这与上游 @deepseek-ai/dsh-client-ui-brand-official 的形态一致。
 *
 * 保留这个文件是为了满足 dsh 双半插件（dual-half）的包结构约定：
 * 一个包可以同时有 node 半 与 browser 半，这里 node 半为空声明。
 */

/** 本包不注入任何 Host 侧服务。 */
export const inject = []

/** 空实现：品牌只在浏览器侧生效。 */
export function apply(): void {
  // intentional no-op
}
