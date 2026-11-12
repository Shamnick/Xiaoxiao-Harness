/**
 * Browser 侧入口：注册侧栏品牌插槽的两个占用者。
 *
 * 结构严格对齐上游 @deepseek-ai/dsh-client-ui-brand-official 的行为：
 * 它只做一件事 —— 占用 sidebar.brand.mark 与 sidebar.brand.name 两个插槽。
 * 换品牌就是换这个占用者，不改任何上游源码。
 */
import { BrandMark, BrandName } from './Brand'

/** 必需服务：插槽注册表。 */
export const inject = ['slots']

/** 插槽名（与上游一致，不要改）。 */
const SLOT_MARK = 'sidebar.brand.mark'
const SLOT_NAME = 'sidebar.brand.name'

/** 最小化描述 ctx 的形状，避免依赖未导出的内部类型。 */
interface SlotRegistry {
  inject(slot: string, fn: () => unknown): unknown
  register(desc: { name: string }, component: unknown): unknown
}

interface Context {
  slots: SlotRegistry
}

/**
 * 把两个品牌插槽作为一个声明式注册集填上。
 *
 * 注意嵌套顺序与上游一致（mark 外层、name 内层），
 * 保证与其它占用者共存时的解析顺序不被打乱。
 */
export function apply(ctx: Context): void {
  ctx.slots.inject(SLOT_MARK, () =>
    ctx.slots.inject(SLOT_NAME, function* () {
      yield ctx.slots.register({ name: SLOT_MARK }, BrandMark)
      yield ctx.slots.register({ name: SLOT_NAME }, BrandName)
    }),
  )
}
