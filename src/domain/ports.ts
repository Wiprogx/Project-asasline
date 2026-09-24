/**
 * Ports (legacy PORTS): the UN/LOCODEs the office ships from and to, with their name and
 * country. Seed for the `ports` Settings table; the running app reads the table. A port typed
 * that is not in the table is still accepted — the table suggests, it does not restrict.
 */
export type Port = { code: string; name: string; country: string };

export const PORT_CODE = /^[A-Z]{2}[A-Z2-9]{3}$/;

/**
 * The editor's text: one port per line as `CODE Name CC` (the country last). Blank lines are
 * dropped, a code twice keeps its first line, and a bad line is reported by number.
 */
export function parsePortLines(text: string): { ports: Port[]; problems: string[] } {
  const ports: Port[] = [];
  const problems: string[] = [];
  const seen = new Set<string>();
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const m = /^([A-Za-z0-9]{5})\s+(.+?)\s+([A-Za-z]{2})$/.exec(line);
    if (!m || !PORT_CODE.test(m[1].toUpperCase())) {
      problems.push(`Line ${i + 1}: expected "CODE Name CC", e.g. BEANR Antwerp BE`);
      return;
    }
    const code = m[1].toUpperCase();
    if (seen.has(code)) return;
    seen.add(code);
    ports.push({ code, name: m[2].trim(), country: m[3].toUpperCase() });
  });
  return { ports, problems };
}

export const portLines = (ports: readonly Port[]) =>
  ports.map((p) => `${p.code} ${p.name} ${p.country}`).join("\n");

/** The legacy table in the editor's own line format, twelve ports a line, "; " between. */
const TABLE = [
  "BEANR Antwerp BE; BEZEE Zeebrugge BE; BEGNE Ghent BE; NLRTM Rotterdam NL; NLAMS Amsterdam NL; NLVLI Vlissingen NL; DEHAM Hamburg DE; DEBRV Bremerhaven DE; DEWVN Wilhelmshaven DE; FRLEH Le Havre FR; FRDKK Dunkirk FR; FRRON Rouen FR",
  "GBFXT Felixstowe GB; GBLGP London Gateway GB; GBSOU Southampton GB; GBLIV Liverpool GB; GBTEE Teesport GB; GBGRG Grangemouth GB; IEDUB Dublin IE; IEORK Cork IE; PLGDN Gdansk PL; PLGDY Gdynia PL; LTKLJ Klaipeda LT; LVRIX Riga LV",
  "EETLL Tallinn EE; FIHEL Helsinki FI; FIKTK Kotka FI; SEGOT Gothenburg SE; SEHEL Helsingborg SE; DKAAR Aarhus DK; DKCPH Copenhagen DK; NOOSL Oslo NO; RULED St Petersburg RU; RUKGD Kaliningrad RU; ESVLC Valencia ES; ESALG Algeciras ES",
  "ESBCN Barcelona ES; ESBIO Bilbao ES; ESLPA Las Palmas ES; ESTCI Tenerife ES; PTLIS Lisbon PT; PTLEI Leixoes PT; PTSIE Sines PT; FRFOS Fos-sur-Mer FR; FRMRS Marseille FR; ITGOA Genoa IT; ITSPE La Spezia IT; ITLIV Livorno IT",
  "ITGIT Gioia Tauro IT; ITNAP Naples IT; ITSAL Salerno IT; ITTRS Trieste IT; ITVCE Venice IT; ITRAN Ravenna IT; MTMAR Marsaxlokk MT; SIKOP Koper SI; HRRJK Rijeka HR; GRPIR Piraeus GR; GRSKG Thessaloniki GR; CYLMS Limassol CY",
  "TRIST Istanbul (Ambarli) TR; TRIZM Izmir TR; TRALI Aliaga TR; TRGEM Gemlik TR; TRMER Mersin TR; TRISK Iskenderun TR; TRTEK Tekirdag TR; TRSSX Samsun TR; ROCND Constanta RO; BGVAR Varna BG; BGBOJ Burgas BG; UAODS Odessa UA",
  "GEPTI Poti GE; GEBUS Batumi GE; LBBEY Beirut LB; SYLTK Lattakia SY; SYTTS Tartus SY; ILHFA Haifa IL; ILASH Ashdod IL; JOAQJ Aqaba JO; MACAS Casablanca MA; MATNG Tanger Med MA; MAAGA Agadir MA; DZALG Algiers DZ",
  "DZORN Oran DZ; DZAAE Annaba DZ; TNTUN Tunis (Rades) TN; TNSFA Sfax TN; TNSUS Sousse TN; LYTIP Tripoli LY; LYBEN Benghazi LY; LYMRA Misurata LY; LYKHO Khoms LY; EGALY Alexandria EG; EGPSD Port Said EG; EGSOK Sokhna EG",
  "EGDAM Damietta EG; EGEDK Dekheila EG; SNDKR Dakar SN; MRNKC Nouakchott MR; GMBJL Banjul GM; GNCKY Conakry GN; SLFNA Freetown SL; LRMLW Monrovia LR; CIABJ Abidjan CI; CISPY San Pedro CI; GHTEM Tema GH; GHTKD Takoradi GH",
  "TGLFW Lome TG; BJCOO Cotonou BJ; NGLOS Lagos (Apapa) NG; NGTIN Lagos (Tin Can) NG; NGONN Onne NG; NGCBQ Calabar NG; CMDLA Douala CM; CMKBI Kribi CM; GQSSG Malabo GQ; GQBSG Bata GQ; GALBV Libreville GA; GAPOG Port-Gentil GA",
  "GAOWE Owendo GA; CGPNR Pointe-Noire CG; CDMAT Matadi CD; CDBOA Boma CD; AOLAD Luanda AO; AOLOB Lobito AO; AONAM Namibe AO; NAWVB Walvis Bay NA; ZACPT Cape Town ZA; ZAPLZ Port Elizabeth ZA; ZAZBA Ngqura (Coega) ZA; ZADUR Durban ZA",
  "MZMPM Maputo MZ; MZBEW Beira MZ; MZUEL Nacala MZ; MGTMM Toamasina MG; MUPLU Port Louis MU; TZDAR Dar es Salaam TZ; KEMBA Mombasa KE; DJJIB Djibouti DJ; SDPZU Port Sudan SD; SOMGQ Mogadishu SO; SAJED Jeddah SA; SADMM Dammam SA",
  "SAJUB Jubail SA; SAKAC King Abdullah Port SA; YEHOD Hodeidah YE; YEADE Aden YE; AEJEA Jebel Ali AE; AESHJ Sharjah AE; AEKLF Khalifa (Abu Dhabi) AE; AEAJM Ajman AE; AEFJR Fujairah AE; OMSLL Salalah OM; OMSOH Sohar OM; OMMCT Muscat OM",
  "QAHMD Hamad QA; BHKBS Khalifa Bin Salman BH; KWSWK Shuwaikh KW; KWSAA Shuaiba KW; IQUQR Umm Qasr IQ; IRBND Bandar Abbas IR; IRBUZ Bushehr IR; PKKHI Karachi PK; PKQCT Port Qasim PK; PKGWD Gwadar PK; INMUN Mundra IN; INNSA Nhava Sheva (JNPT) IN",
  "INBOM Mumbai IN; INHZR Hazira IN; INPAV Pipavav IN; INIXY Kandla IN; INMAA Chennai IN; INENR Ennore (Kamarajar) IN; INTUT Tuticorin IN; INCOK Cochin IN; INVTZ Visakhapatnam IN; INCCU Kolkata IN; INHAL Haldia IN; INKRI Krishnapatnam IN",
  "LKCMB Colombo LK; BDCGP Chittagong BD; BDMGL Mongla BD; MVMLE Male MV; SGSIN Singapore SG; MYPKG Port Klang MY; MYTPP Tanjung Pelepas MY; MYPEN Penang MY; MYBTU Bintulu MY; MYKCH Kuching MY; THLCH Laem Chabang TH; THBKK Bangkok TH",
  "VNSGN Ho Chi Minh City VN; VNCLI Cai Mep VN; VNHPH Haiphong VN; VNDAD Da Nang VN; IDJKT Jakarta (Tanjung Priok) ID; IDSUB Surabaya ID; IDBLW Belawan ID; IDSRG Semarang ID; PHMNL Manila PH; PHCEB Cebu PH; KHSIH Sihanoukville KH; MMRGN Yangon MM",
  "BNMUA Muara BN; CNSHA Shanghai CN; CNNGB Ningbo CN; CNSZX Shenzhen CN; CNYTN Yantian CN; CNCAN Guangzhou CN; CNHUA Huangpu CN; CNTAO Qingdao CN; CNTXG Tianjin CN; CNDLC Dalian CN; CNXMN Xiamen CN; CNFOC Fuzhou CN",
  "CNLYG Lianyungang CN; CNSWA Shantou CN; CNZHA Zhanjiang CN; CNNKG Nanjing CN; HKHKG Hong Kong HK; TWKHH Kaohsiung TW; TWKEL Keelung TW; TWTXG Taichung TW; KRPUS Busan KR; KRINC Incheon KR; KRKAN Gwangyang KR; JPTYO Tokyo JP",
  "JPYOK Yokohama JP; JPUKB Kobe JP; JPNGO Nagoya JP; JPOSA Osaka JP; JPHKT Hakata JP; USNYC New York / New Jersey US; USBAL Baltimore US; USORF Norfolk US; USCHS Charleston US; USSAV Savannah US; USJAX Jacksonville US; USMIA Miami US",
  "USPEF Port Everglades US; USHOU Houston US; USNOL New Orleans US; USMOB Mobile US; USLAX Los Angeles US; USLGB Long Beach US; USOAK Oakland US; USSEA Seattle US; USTIW Tacoma US; USPDX Portland US; CAMTR Montreal CA; CAHAL Halifax CA",
  "CAVAN Vancouver CA; CAPRR Prince Rupert CA; MXVER Veracruz MX; MXATM Altamira MX; MXZLO Manzanillo MX; MXLZC Lazaro Cardenas MX; MXESE Ensenada MX; PABLB Balboa PA; PACRI Cristobal PA; PAMIT Manzanillo (Colon) PA; CRLIO Puerto Limon CR; CRCAL Caldera CR",
  "GTSTC Santo Tomas de Castilla GT; GTQUE Puerto Quetzal GT; HNPCR Puerto Cortes HN; NIICI Corinto NI; SVAQJ Acajutla SV; DOCAU Caucedo DO; DOHAI Rio Haina DO; JMKIN Kingston JM; HTPAP Port-au-Prince HT; TTPOS Port of Spain TT; BSFPO Freeport BS; CUHAV Havana CU",
  "COCTG Cartagena CO; COBUN Buenaventura CO; COBAQ Barranquilla CO; VELAG La Guaira VE; VEPBL Puerto Cabello VE; ECGYE Guayaquil EC; ECPBO Posorja EC; PECLL Callao PE; PEPAI Paita PE; CLVAP Valparaiso CL; CLSAI San Antonio CL; CLSVE San Vicente CL",
  "BRSSZ Santos BR; BRRIO Rio de Janeiro BR; BRPNG Paranagua BR; BRITJ Itajai BR; BRNVT Navegantes BR; BRRIG Rio Grande BR; BRSUA Suape BR; BRSSA Salvador BR; BRVIX Vitoria BR; BRMAO Manaus BR; BRPEC Pecem BR; ARBUE Buenos Aires AR",
  "ARZAE Zarate AR; UYMVD Montevideo UY; PYASU Asuncion PY",
];

export const DEFAULT_PORTS: Port[] = parsePortLines(TABLE.join("; ").replace(/;\s*/g, "\n")).ports;
