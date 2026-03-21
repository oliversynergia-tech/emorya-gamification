export type BrandThemeTokens = Record<`--${string}`, string>;

export type BrandTheme = {
  id: string;
  label: string;
  brand: {
    platformName: string;
    metadataTitle: string;
    metadataDescription: string;
    homeAriaLabel: string;
    logoSrc: string;
    logoAlt: string;
    logoWidth: number;
    logoHeight: number;
    defaultEyebrow: string;
    defaultTagline: string;
  };
  tokens: BrandThemeTokens;
};
