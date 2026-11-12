/**
 * 品牌 occupant 插件（browser 半）。
 *
 * 与上游的差异：
 * - 上游仅在 `DSH_CLIENT_BUILD_PROFILE === 'official'` 时注册侧栏品牌插槽，
 *   自有品牌产品必须无条件注册，否则侧栏会退回到上游声明方的兜底视觉。
 * - 不再注册 `conversation.hero.frame` 的鲸鱼装饰（上游标志性视觉，自有产品不携带）。
 *   若要恢复首屏装饰，把下面的 hero 注册取消注释即可。
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { OfficialBrandMark, OfficialBrandName } from './Brand.tsx'

/** Required service: the UI slot registry. */
export const inject = ['slots']

/**
 * 注册自有品牌的侧栏 mark 与 name 两个插槽。
 * @param ctx - Client root context.
 */
export function apply(ctx: ClientContext): void {
  // 首屏装饰（可选）：
  // ctx.slots.inject('conversation.hero.frame', () => ctx.slots.register({
  //   name: 'conversation.hero.frame',
  //   id: 'xiaoxiao-hero',
  // }, HeroArtwork))

  ctx.slots.inject('sidebar.brand.mark', () =>
    ctx.slots.inject('sidebar.brand.name', function* () {
      yield ctx.slots.register({ name: 'sidebar.brand.mark' }, OfficialBrandMark)
      yield ctx.slots.register({ name: 'sidebar.brand.name' }, OfficialBrandName)
    }))
}
