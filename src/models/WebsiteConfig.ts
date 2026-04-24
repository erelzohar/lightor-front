import { Social } from './Social';
import { HeroConfig } from './HeroConfig';
import { AboutConfig } from './AboutConfig';
import { PortfolioConfig } from './PortfolioConfig';
import { ScheduleConfig } from './ScheduleConfig';
import { ContactConfig } from './ContactConfig';
import { Vacation } from './Vacation';
import { AppointmentType } from './AppointmentType';

export class Address {
  constructor(
    public state: string,
    public city: string,
    public street: string,
    public other: string
  ) {}

  static fromJSON(json: any): Address {
    return new Address(
      json.state,
      json.city,
      json.street,
      json.other
    );
  }
}

export class Contact {
  constructor(
    public phone: string,
    public mail: string
  ) {}

  static fromJSON(json: any): Contact {
    return new Contact(
      json.phone,
      json.mail
    );
  }
}

export class Palette {
  constructor(
    public colorPrimary: string,
    public colorPrimaryDark: string,
    public colorLightBg: string,
    public colorLightSurface: string,
    public colorLightGray: string,
    public colorLightText: string,
    public colorDarkBg: string,
    public colorDarkSurface: string,
    public colorDarkGray: string,
    public colorDarkText: string
  ) {}

  static fromJSON(json: any): Palette {
    return new Palette(
      json.colorPrimary,
      json.colorPrimaryDark,
      json.colorLightBg,
      json.colorLightSurface,
      json.colorLightGray,
      json.colorLightText,
      json.colorDarkBg,
      json.colorDarkSurface,
      json.colorDarkGray,
      json.colorDarkText
    );
  }
}

export class NavbarConfig {
  constructor(
    public visible: boolean,
    public darkMode: boolean,
    public languageSwitcher: boolean
  ) {}

  static fromJSON(json: any): NavbarConfig {
    return new NavbarConfig(
      json.visible,
      json.darkMode,
      json.languageSwitcher
    );
  }
}

export class IntroPopupConfig {
  constructor(
    public visible: boolean,
    public value: string
  ) {}

  static fromJSON(json: any): IntroPopupConfig {
    return new IntroPopupConfig(
      json.visible,
      json.value
    );
  }
}

export class ContactButtonConfig {
  constructor(
    public visible: boolean
  ) {}

  static fromJSON(json: any): ContactButtonConfig {
    return new ContactButtonConfig(
      json.visible
    );
  }
}

export class Components {
  constructor(
    public navbar: NavbarConfig,
    public hero: HeroConfig,
    public about: AboutConfig,
    public portfolio: PortfolioConfig,
    public schedule: ScheduleConfig,
    public contact: ContactConfig,
    public footer: { visible: boolean; description: string },
    public introPopup: IntroPopupConfig,
    public contactButton: ContactButtonConfig
  ) {}

  static fromJSON(json: any): Components {
    return new Components(
      NavbarConfig.fromJSON(json.navbar),
      HeroConfig.fromJSON(json.hero),
      AboutConfig.fromJSON(json.about),
      PortfolioConfig.fromJSON(json.portfolio),
      ScheduleConfig.fromJSON(json.schedule),
      ContactConfig.fromJSON(json.contact),
      json.footer,
      IntroPopupConfig.fromJSON(json.introPopup),
      ContactButtonConfig.fromJSON(json.contactButton)
    );
  }
}

export class WebsiteConfig {
  constructor(
    public user_id: string,
    public businessName: string,
    public logoImageName: string,
    public vacations: Vacation[],
    public appointmentTypes: AppointmentType[],
    public subDomain: string,
    public minCancelTimeMS: number,
    // public minsPerSlot: number,
    public defaultLanguage: string,
    public workingDays: (string | null)[],
    public address: Address,
    public contact: Contact,
    public social: Social,
    public pallete: Palette,
    public components: Components
  ) {}

  static fromJSON(json: any): WebsiteConfig {    
    return new WebsiteConfig(
      json.user_id,
      json.businessName,
      json.logoImageName,
      json.vacations.map((vacation: any) => Vacation.fromJSON(vacation)),
      json.appointmentTypes.map((type: any) => AppointmentType.fromJSON(type)),
      json.subDomain,
      json.minCancelTimeMS,
      // json.minsPerSlot,
      json.defaultLanguage,
      json.workingDays,
      Address.fromJSON(json.address),
      Contact.fromJSON(json.contact),
      Social.fromJSON(json.social),
      Palette.fromJSON(json.pallete),
      Components.fromJSON(json.components)
    );
  }
}