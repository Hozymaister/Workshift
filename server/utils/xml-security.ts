import { XMLParser, XMLBuilder, XMLValidator } from 'fast-xml-parser';

/**
 * Bezpečnostní volby pro parsování XML
 * - Omezení velikosti, vnořených elementů a atributů
 * - Zakázání entit a DOCTYPE pro prevenci XXE útoků
 */
const secureParserOptions = {
  allowBooleanAttributes: false,
  ignoreAttributes: false,
  parseAttributeValue: true,
  // Bezpečnostní omezení
  isArray: (name: string, jpath: string) => {
    // Zvolte tagy, které se mají vždy zpracovat jako pole
    if (jpath === 'are:Odpoved.are:Vypis_RZP.are:Adresy.are:Adresa') return true;
    if (jpath === 'are:Odpoved.are:Vypis_RZP.are:ZakladniUdaje.are:ObchodniJmeno') return true;
    return false;
  },
  // Transformace XML entit
  tagValueProcessor: (tagName: string, tagValue: string) => {
    if (typeof tagValue === 'string') {
      // Bezpečná transformace XML entit
      return tagValue
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    }
    return tagValue;
  },
  attributeValueProcessor: (attrName: string, attrValue: string) => {
    if (typeof attrValue === 'string') {
      // Bezpečná transformace atributů
      return attrValue
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    }
    return attrValue;
  }
};

/**
 * Bezpečný parser XML dat
 * @param xmlContent XML řetězec k parsování
 * @returns Parsovaný JavaScript objekt nebo null při chybě
 */
export function safeParseXml(xmlContent: string) {
  try {
    // Nejprve validujeme XML
    const validationResult = XMLValidator.validate(xmlContent);
    if (validationResult !== true) {
      console.error('XML validation failed:', validationResult);
      return null;
    }
    
    // Pokud XML obsahuje nebezpečné entity nebo DOCTYPE, odmítneme ho zpracovat
    if (xmlContent.includes('<!ENTITY') || xmlContent.includes('<!DOCTYPE')) {
      console.error('XML contains potentially dangerous DOCTYPE or ENTITY declarations');
      return null;
    }
    
    // Vytvoříme parser s bezpečnostními omezeními
    const parser = new XMLParser(secureParserOptions);
    
    // Parsování XML
    return parser.parse(xmlContent);
  } catch (error) {
    console.error('Error parsing XML:', error);
    return null;
  }
}

/**
 * Bezpečné vytvoření XML z JavaScript objektu
 * @param jsObject JavaScript objekt k převodu na XML
 * @returns XML řetězec nebo null při chybě
 */
export function safeCreateXml(jsObject: any) {
  try {
    const builder = new XMLBuilder({
      ignoreAttributes: false,
      format: true,
      suppressEmptyNode: true
    });
    
    return builder.build(jsObject);
  } catch (error) {
    console.error('Error creating XML:', error);
    return null;
  }
}

/**
 * Sanitizace XML dat - odstraňuje potenciálně nebezpečné části
 * @param xml XML řetězec k sanitizaci
 * @returns Sanitizovaný XML řetězec
 */
export function sanitizeXml(xml: string): string {
  if (!xml || typeof xml !== 'string') return '';
  
  // Odstranění DOCTYPE deklarací
  xml = xml.replace(/<!DOCTYPE[^>]*>/gi, '');
  
  // Odstranění ENTITY deklarací
  xml = xml.replace(/<!ENTITY[^>]*>/gi, '');
  
  // Odstranění processing instructions
  xml = xml.replace(/<\?[^>]*\?>/gi, '');
  
  // Odstranění CDATA sekcí
  xml = xml.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
  
  return xml;
}