export type Language = 'cs' | 'en';

export type TranslationKey = 
  | 'dashboard' | 'shifts' | 'shift_table' | 'exchanges' | 'workplaces' 
  | 'workers' | 'reports' | 'invoice' | 'customers' | 'scan' | 'profile' 
  | 'settings' | 'logout' | 'language' | 'login' | 'register' | 'email' 
  | 'password' | 'confirm_password' | 'forgot_password' | 'reset_password' 
  | 'login_error' | 'password_reset_email_sent' | 'username' | 'first_name' 
  | 'last_name' | 'add_worker' | 'edit_worker' | 'delete_worker' | 'search_workers' 
  | 'hourly_wage' | 'date_of_birth' | 'personal_id' | 'phone' | 'notes' | 'role' 
  | 'admin' | 'user' | 'call' | 'save' | 'cancel' | 'actions' | 'workplace_name' 
  | 'workplace_type' | 'workplace_address' | 'add_workplace' | 'edit_workplace' 
  | 'delete_workplace' | 'date' | 'start_time' | 'end_time' | 'add_shift' 
  | 'edit_shift' | 'delete_shift' | 'exchange_shift' | 'success' | 'error' 
  | 'warning' | 'info' | 'loading' | 'no_data' | 'confirm' | 'submit' | 'select' | 'search';

type TranslationsType = {
  [key in Language]: {
    [key in TranslationKey]: string;
  }
};

// Definice všech textových řetězců v češtině a angličtině
export const translations: TranslationsType = {
  // Navigace a UI
  'cs': {
    // Hlavní navigace
    'dashboard': 'Přehled',
    'shifts': 'Směny',
    'shift_table': 'Tabulka směn',
    'exchanges': 'Výměny',
    'workplaces': 'Pracoviště',
    'workers': 'Pracovníci',
    'reports': 'Hlášení',
    'invoice': 'Fakturace',
    'customers': 'Zákazníci',
    'scan': 'Skenování',
    'profile': 'Profil',
    'settings': 'Nastavení',
    'logout': 'Odhlásit se',
    'language': 'Jazyk',

    // Autentizace
    'login': 'Přihlásit se',
    'register': 'Registrovat se',
    'email': 'E-mail',
    'password': 'Heslo',
    'confirm_password': 'Potvrdit heslo',
    'forgot_password': 'Zapomenuté heslo',
    'reset_password': 'Obnovit heslo',
    'login_error': 'Přihlášení se nezdařilo',
    'password_reset_email_sent': 'E-mail pro obnovení hesla byl odeslán',
    'username': 'Uživatelské jméno',
    'first_name': 'Jméno',
    'last_name': 'Příjmení',

    // Tabulka pracovníků
    'add_worker': 'Přidat pracovníka',
    'edit_worker': 'Upravit pracovníka',
    'delete_worker': 'Odstranit pracovníka',
    'search_workers': 'Hledat pracovníky',
    'hourly_wage': 'Hodinová mzda',
    'date_of_birth': 'Datum narození',
    'personal_id': 'Rodné číslo',
    'phone': 'Telefon',
    'notes': 'Poznámky',
    'role': 'Role',
    'admin': 'Administrátor',
    'user': 'Uživatel',
    'call': 'Volat',
    'save': 'Uložit',
    'cancel': 'Zrušit',
    'actions': 'Akce',

    // Pracoviště
    'workplace_name': 'Název pracoviště',
    'workplace_type': 'Typ pracoviště',
    'workplace_address': 'Adresa',
    'add_workplace': 'Přidat pracoviště',
    'edit_workplace': 'Upravit pracoviště',
    'delete_workplace': 'Odstranit pracoviště',

    // Směny
    'date': 'Datum',
    'start_time': 'Čas začátku',
    'end_time': 'Čas konce',
    'add_shift': 'Přidat směnu',
    'edit_shift': 'Upravit směnu',
    'delete_shift': 'Odstranit směnu',
    'exchange_shift': 'Vyměnit směnu',

    // Obecné
    'success': 'Úspěch',
    'error': 'Chyba',
    'warning': 'Upozornění',
    'info': 'Informace',
    'loading': 'Načítání...',
    'no_data': 'Žádná data',
    'confirm': 'Potvrdit',
    'submit': 'Odeslat',
    'select': 'Vybrat',
    'search': 'Hledat',
  },
  'en': {
    // Main navigation
    'dashboard': 'Dashboard',
    'shifts': 'Shifts',
    'shift_table': 'Shift Table',
    'exchanges': 'Exchanges',
    'workplaces': 'Workplaces',
    'workers': 'Workers',
    'reports': 'Reports',
    'invoice': 'Invoicing',
    'customers': 'Customers',
    'scan': 'Scanning',
    'profile': 'Profile',
    'settings': 'Settings',
    'logout': 'Log out',
    'language': 'Language',

    // Authentication
    'login': 'Log in',
    'register': 'Register',
    'email': 'Email',
    'password': 'Password',
    'confirm_password': 'Confirm Password',
    'forgot_password': 'Forgot Password',
    'reset_password': 'Reset Password',
    'login_error': 'Login failed',
    'password_reset_email_sent': 'Password reset email has been sent',
    'username': 'Username',
    'first_name': 'First Name',
    'last_name': 'Last Name',

    // Workers table
    'add_worker': 'Add Worker',
    'edit_worker': 'Edit Worker',
    'delete_worker': 'Delete Worker',
    'search_workers': 'Search Workers',
    'hourly_wage': 'Hourly Wage',
    'date_of_birth': 'Date of Birth',
    'personal_id': 'Personal ID',
    'phone': 'Phone',
    'notes': 'Notes',
    'role': 'Role',
    'admin': 'Administrator',
    'user': 'User',
    'call': 'Call',
    'save': 'Save',
    'cancel': 'Cancel',
    'actions': 'Actions',

    // Workplaces
    'workplace_name': 'Workplace Name',
    'workplace_type': 'Workplace Type',
    'workplace_address': 'Address',
    'add_workplace': 'Add Workplace',
    'edit_workplace': 'Edit Workplace',
    'delete_workplace': 'Delete Workplace',

    // Shifts
    'date': 'Date',
    'start_time': 'Start Time',
    'end_time': 'End Time',
    'add_shift': 'Add Shift',
    'edit_shift': 'Edit Shift',
    'delete_shift': 'Delete Shift',
    'exchange_shift': 'Exchange Shift',

    // General
    'success': 'Success',
    'error': 'Error',
    'warning': 'Warning',
    'info': 'Information',
    'loading': 'Loading...',
    'no_data': 'No data',
    'confirm': 'Confirm',
    'submit': 'Submit',
    'select': 'Select',
    'search': 'Search',
  }
};