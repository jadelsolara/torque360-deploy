import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

export const locales = ['es', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'es';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headersList = await headers();

  const cookieLocale = cookieStore.get('locale')?.value;
  const acceptLang = headersList.get('accept-language')?.split(',')[0]?.split('-')[0];

  let locale: Locale = defaultLocale;
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    locale = cookieLocale as Locale;
  } else if (acceptLang && locales.includes(acceptLang as Locale)) {
    locale = acceptLang as Locale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
