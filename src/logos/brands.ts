/**
 * Known merchants whose real logos ship with the site (public/logos/<slug>.webp, downloaded once by
 * scripts/fetch-logos.ts). They render instantly and never depend on a lookup service guessing right —
 * online search confuses e.g. OKKO with okko.tv or Нова пошта with a business school.
 *
 * Self-contained on purpose: the Node script imports this file directly.
 */
export interface Brand {
  slug: string
  /** official site the logo is taken from */
  domain: string
  /** name variants as they appear in monobank statements, matched as whole words */
  names: string[]
  /** match only at the start of the description — for short names that occur inside other phrases */
  prefixOnly?: boolean
  /**
   * Hotlink Brandfetch's icon for exactly this domain: it is crisp, while the site only offers a tiny
   * favicon or blocks downloads. The bundled file, if any, is the fallback.
   */
  remote?: boolean
}

const REMOTE = new Set([
  'silpo', 'novus', 'auchan', 'fozzy', 'biedronka', 'prostor', 'watsons', 'brocard', 'add', 'podorozhnyk',
  'salateira', 'bolt', 'uz', 'okko', 'klo', 'brsm', 'ukrposhta', 'kyivstar', 'lanet', 'dtek', 'naftogaz',
  'amazon', 'zara', 'hm', 'reserved', 'lcwaikiki', 'intertop', 'decathlon', 'adidas', 'multiplex',
  'sweettv', 'epicgames', 'youtube', 'netflix', 'openai', 'dropbox', 'linkedin',
])

const b = (slug: string, domain: string, names: string[], prefixOnly = false): Brand => ({
  slug,
  domain,
  names,
  prefixOnly,
  remote: REMOTE.has(slug),
})

/** First match wins: specific brands go before generic ones, payment aggregators are left out entirely. */
export const BRANDS: Brand[] = [
  // супермаркети
  b('atb', 'atbmarket.com', ['атб', 'atb', 'атб маркет', 'atb market']),
  b('silpo', 'silpo.ua', ['сільпо', 'silpo', 'le silpo']),
  b('novus', 'novus.ua', ['novus', 'новус']),
  b('fora', 'fora.ua', ['фора', 'fora'], true),
  b('varus', 'varus.ua', ['varus', 'варус']),
  b('metro', 'metro.ua', ['metro cash', 'метро кеш', 'metro'], true),
  b('auchan', 'auchan.ua', ['auchan', 'ашан']),
  b('fozzy', 'fozzy.ua', ['fozzy', 'фоззі']),
  b('velmart', 'velmart.ua', ['велмарт', 'velmart']),
  b('tavria', 'tavriav.ua', ['таврія в', 'tavria v', 'tavriav']),
  b('nashkray', 'nashkraj.ua', ['наш край', 'nash kraj', 'nash kray']),
  b('rukavychka', 'rukavychka.ua', ['рукавичка', 'rukavychka']),
  b('blyzenko', 'blyzenko.ua', ['близенько', 'blyzenko']),
  b('lidl', 'lidl.pl', ['lidl']),
  b('biedronka', 'biedronka.pl', ['biedronka']),
  b('zabka', 'zabka.pl', ['zabka', 'żabka']),
  b('rossmann', 'rossmann.pl', ['rossmann']),

  // косметика й аптеки
  b('eva', 'eva.ua', ['eva', 'єва'], true),
  b('watsons', 'watsons.ua', ['watsons', 'ватсонс']),
  b('prostor', 'prostor.ua', ['prostor', 'простор'], true),
  b('makeup', 'makeup.com.ua', ['makeup', 'make up'], true),
  b('brocard', 'brocard.ua', ['brocard', 'брокард']),
  b('add', 'add.ua', ['аптека доброго дня', 'apteka dobroho dnia', 'доброго дня']),
  b('anc', 'anc.ua', ['аптека анц', 'анц', 'anc'], true),
  b('podorozhnyk', 'podorozhnyk.ua', ['подорожник', 'podorozhnyk']),
  b('apteka911', 'apteka911.ua', ['аптека 911', 'apteka 911']),

  // кафе й ресторани
  b('mcdonalds', 'mcdonalds.ua', ['mcdonalds', 'mcdonald s', 'макдональдз', 'макдональдс']),
  b('kfc', 'kfc.ua', ['kfc']),
  b('puzatahata', 'puzatahata.ua', ['пузата хата', 'puzata hata', 'puzata khata']),
  b('aromakava', 'aromakava.ua', ['aroma kava', 'арома кава', 'aromakava']),
  b('lvivcroissants', 'lvivcroissants.com', ['lviv croissants', 'львівські круасани']),
  b('salateira', 'salateira.com', ['salateira', 'салатейра']),
  b('dominos', 'dominos.ua', ['dominos', 'domino s', 'доміно с']),
  b('mafia', 'mafia.ua', ['мафія', 'mafia'], true),
  b('starbucks', 'starbucks.com', ['starbucks']),

  // доставка, таксі, транспорт, подорожі
  b('glovo', 'glovoapp.com', ['glovo']),
  b('bolt', 'bolt.eu', ['bolt']),
  b('uklon', 'uklon.com.ua', ['uklon', 'уклон']),
  b('uber', 'uber.com', ['uber']),
  b('wolt', 'wolt.com', ['wolt']),
  b('uz', 'dp.uz.gov.ua', ['укрзалізниця', 'ukrzaliznytsia', 'uz gov ua', 'booking uz']),
  b('ryanair', 'ryanair.com', ['ryanair']),
  b('wizzair', 'wizzair.com', ['wizz air', 'wizzair', 'wizz']),
  b('flixbus', 'flixbus.com', ['flixbus', 'flix']),
  b('intercity', 'intercity.pl', ['pkp intercity', 'intercity']),
  b('booking', 'booking.com', ['booking com', 'booking']),
  b('airbnb', 'airbnb.com', ['airbnb']),

  // АЗС
  b('okko', 'okko.ua', ['okko', 'окко']),
  b('wog', 'wog.ua', ['wog', 'вог']),
  b('socar', 'socar.ua', ['socar', 'сокар']),
  b('upg', 'upg.ua', ['upg']),
  b('brsm', 'brsm-nafta.com', ['brsm', 'брсм']),
  b('shell', 'shell.com', ['shell']),
  b('klo', 'klo.ua', ['klo', 'кло'], true),
  b('ukrnafta', 'ukrnafta.com', ['укрнафта', 'ukrnafta']),

  // пошта, звʼязок, комуналка
  b('novaposhta', 'novaposhta.ua', ['нова пошта', 'nova poshta', 'novaposhta', 'nova post']),
  b('ukrposhta', 'ukrposhta.ua', ['укрпошта', 'ukrposhta']),
  b('meest', 'meest.com', ['meest']),
  b('kyivstar', 'kyivstar.ua', ['київстар', 'kyivstar']),
  b('lifecell', 'lifecell.ua', ['lifecell', 'лайфселл']),
  b('vodafone', 'vodafone.ua', ['vodafone', 'водафон']),
  b('volia', 'volia.com', ['воля', 'volia'], true),
  b('datagroup', 'datagroup.ua', ['datagroup', 'датагруп']),
  b('lanet', 'lanet.ua', ['ланет', 'lanet'], true),
  b('yasno', 'yasno.com.ua', ['yasno', 'ясно'], true),
  b('dtek', 'dtek.com', ['дтек', 'dtek']),
  b('naftogaz', 'naftogaz.com', ['нафтогаз', 'naftogaz']),

  // техніка, маркетплейси, дім
  b('rozetka', 'rozetka.com.ua', ['rozetka', 'розетка']),
  b('epicentr', 'epicentrk.ua', ['епіцентр', 'epicentr', 'epicentrk', 'epicentr k']),
  b('novalinia', 'nl.ua', ['нова лінія', 'nova liniya']),
  b('comfy', 'comfy.ua', ['comfy', 'комфі']),
  b('foxtrot', 'foxtrot.com.ua', ['фокстрот', 'foxtrot']),
  b('citrus', 'ctrs.com.ua', ['цитрус', 'citrus']),
  b('allo', 'allo.ua', ['алло', 'allo'], true),
  b('moyo', 'moyo.ua', ['moyo', 'мойо']),
  b('prom', 'prom.ua', ['prom ua', 'prom'], true),
  b('olx', 'olx.ua', ['olx']),
  b('kasta', 'kasta.ua', ['kasta', 'каста'], true),
  b('aliexpress', 'aliexpress.com', ['aliexpress']),
  b('temu', 'temu.com', ['temu']),
  b('amazon', 'amazon.com', ['amazon', 'amzn']),
  b('ikea', 'ikea.com', ['ikea']),
  b('jysk', 'jysk.ua', ['jysk']),
  b('masterzoo', 'masterzoo.ua', ['masterzoo', 'мастерзоо']),

  // одяг і спорт
  b('zara', 'zara.com', ['zara']),
  b('hm', 'hm.com', ['h m', 'hm'], true),
  b('reserved', 'reserved.com', ['reserved'], true),
  b('lcwaikiki', 'lcwaikiki.ua', ['lc waikiki', 'lcwaikiki']),
  b('intertop', 'intertop.ua', ['intertop', 'інтертоп']),
  b('answear', 'answear.ua', ['answear']),
  b('pullbear', 'pullandbear.com', ['pull bear', 'pull and bear']),
  b('bershka', 'bershka.com', ['bershka']),
  b('decathlon', 'decathlon.com', ['decathlon', 'декатлон']),
  b('adidas', 'adidas.com', ['adidas']),
  b('nike', 'nike.com', ['nike']),

  // розваги
  b('multiplex', 'multiplex.ua', ['multiplex', 'мультиплекс']),
  b('planetakino', 'planetakino.ua', ['планета кіно', 'planeta kino']),
  b('sportlife', 'sportlife.ua', ['sport life', 'sportlife', 'спорт лайф']),
  b('megogo', 'megogo.net', ['megogo', 'мегого']),
  b('sweettv', 'sweet.tv', ['sweet tv', 'sweettv']),
  b('steam', 'steampowered.com', ['steam', 'steamgames', 'valve']),
  b('playstation', 'playstation.com', ['playstation', 'sony interactive', 'psn']),
  b('xbox', 'xbox.com', ['xbox']),
  b('nintendo', 'nintendo.com', ['nintendo']),
  b('epicgames', 'epicgames.com', ['epic games']),

  // цифрові сервіси
  b('youtube', 'youtube.com', ['youtube', 'youtubepremium']),
  b('google', 'google.com', ['google']),
  b('apple', 'apple.com', ['apple', 'itunes']),
  b('netflix', 'netflix.com', ['netflix']),
  b('spotify', 'spotify.com', ['spotify']),
  b('microsoft', 'microsoft.com', ['microsoft', 'msft']),
  b('openai', 'openai.com', ['openai', 'chatgpt']),
  b('anthropic', 'claude.ai', ['anthropic', 'claude ai', 'claude']),
  b('github', 'github.com', ['github']),
  b('figma', 'figma.com', ['figma']),
  b('notion', 'notion.so', ['notion']),
  b('canva', 'canva.com', ['canva']),
  b('adobe', 'adobe.com', ['adobe']),
  b('dropbox', 'dropbox.com', ['dropbox']),
  b('telegram', 'telegram.org', ['telegram']),
  b('patreon', 'patreon.com', ['patreon']),
  b('duolingo', 'duolingo.com', ['duolingo']),
  b('cursor', 'cursor.com', ['cursor']),
  b('jetbrains', 'jetbrains.com', ['jetbrains']),
  b('cloudflare', 'cloudflare.com', ['cloudflare']),
  b('digitalocean', 'digitalocean.com', ['digitalocean']),
  b('hetzner', 'hetzner.com', ['hetzner']),
  b('namecheap', 'namecheap.com', ['namecheap']),
  b('linkedin', 'linkedin.com', ['linkedin']),
  b('discord', 'discord.com', ['discord']),
  b('twitch', 'twitch.tv', ['twitch']),
  b('revolut', 'revolut.com', ['revolut']),
  b('binance', 'binance.com', ['binance']),
  // aggregator last so "PAYPAL *STEAMGAMES" resolves to Steam
  b('paypal', 'paypal.com', ['paypal']),
]

export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’ʼ'`"«»]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

const MATCHERS = BRANDS.map((brand) => {
  const alternatives = brand.names.map(normalizeName).join('|')
  return { brand, re: new RegExp(`${brand.prefixOnly ? '^' : '(?:^| )'}(?:${alternatives})(?= |$)`, 'u') }
})

export function brandFor(label: string): Brand | null {
  const name = normalizeName(label)
  return MATCHERS.find((m) => m.re.test(name))?.brand ?? null
}
