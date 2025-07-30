// pregnancy-lens.js
// Enhances information for women who are pregnant, breastfeeding, or of childbearing age.
// Multilingual support and clear code structure.

// --- Language dictionary for user-facing messages ---
const languageDict = {
    en: {
        childbearing: "You are seeing this because you are of childbearing age.",
        pregnant: "You are seeing this because you are pregnant.",
        breastfeeding: "You are seeing this because you are breastfeeding.",
        consult: "If you are pregnant, breastfeeding, think you may be pregnant, or plan to have a baby, consult your doctor or pharmacist before using this medicine."
    },
    es: {
        childbearing: "Ves esto porque estás en edad fértil.",
        pregnant: "Ves esto porque estás embarazada.",
        breastfeeding: "Ves esto porque estás amamantando.",
        consult: "Si está embarazada, amamantando, cree que puede estar embarazada o planea tener un bebé, consulte a su médico o farmacéutico antes de usar este medicamento."
    },
    pt: {
        childbearing: "Você está vendo isso porque está em idade fértil.",
        pregnant: "Você está vendo isso porque está grávida.",
        breastfeeding: "Você está vendo isso porque está amamentando.",
        consult: "Se estiver grávida, amamentando, acha que pode estar grávida ou planeja ter um bebê, consulte seu médico ou farmacêutico antes de usar este medicamento."
    },
    da: {
        childbearing: "Du ser dette, fordi du er i den fødedygtige alder.",
        pregnant: "Du ser dette, fordi du er gravid.",
        breastfeeding: "Du ser dette, fordi du ammer.",
        consult: "Hvis du er gravid, ammer, tror du kan være gravid eller planlægger at få et barn, skal du kontakte din læge eller apotek, før du bruger dette lægemiddel."
    }
};

// --- Data sources (assumed to be globally available or imported) ---
let pvData = pv;
let htmlData = html;
let epiData = epi;
let ipsData = ips;

// --- Utility: Get current specification version ---
let getSpecification = () => "1.0.0";

// --- Pregnancy status object ---
let pregnancyStatus = {
    childbearingAge: true,  // Default, will be set by IPS
    pregnant: false,
    breastfeeding: false
};

// --- Get user-facing report sentence in the selected language ---
function getReport(lang = "en") {
    if (pregnancyStatus.pregnant) return languageDict[lang].pregnant;
    if (pregnancyStatus.breastfeeding) return languageDict[lang].breastfeeding;
    if (pregnancyStatus.childbearingAge) return languageDict[lang].childbearing;
    return "";
}

// --- Annotate HTML with highlight/collapse for relevant categories ---
let annotationProcess = (listOfCategories, enhanceTag, document, response) => {
    listOfCategories.forEach((check) => {
        if (response.includes(check)) {
            let elements = document.getElementsByClassName(check);
            for (let i = 0; i < elements.length; i++) {
                elements[i].classList.add(enhanceTag);
                elements[i].classList.add("pregnancy-lens");
            }
            if (document.getElementsByTagName("head").length > 0) {
                document.getElementsByTagName("head")[0].remove();
            }
            if (document.getElementsByTagName("body").length > 0) {
                response = document.getElementsByTagName("body")[0].innerHTML;
            } else {
                response = document.documentElement.innerHTML;
            }
        }
    });
    if (!response) {
        throw new Error("Annotation process failed: Returned empty or null response");
    } else {
        return response;
    }
};

// --- Annotate HTML section (Node or Browser) ---
let annotateHTMLsection = async (listOfCategories, enhanceTag) => {
    let response = htmlData;
    let document;
    if (typeof window === "undefined") {
        let jsdom = await import("jsdom");
        let { JSDOM } = jsdom;
        let dom = new JSDOM(htmlData);
        document = dom.window.document;
        return annotationProcess(listOfCategories, enhanceTag, document, response);
    } else {
        document = window.document;
        return annotationProcess(listOfCategories, enhanceTag, document, response);
    }
};

// --- Calculate age from birth date ---
let getIPSAge = (birthDate) => {
    let today = new Date();
    let birthDateParsed = new Date(birthDate);
    let ageMiliseconds = today - birthDateParsed;
    let age = Math.floor(ageMiliseconds / 31536000000);
    return age;
};

// --- Main enhance function ---
let enhance = async (lang = "en") => {
    // List of codes to search for in the ePI (pregnancy, breastfeeding, etc.)
    let listOfCategoriesToSearch = ["W78", "77386006", "69840006"];
    let gender;
    let enhanceTag;
    if (!ips) throw new Error("Failed to load IPS: the LEE is getting an empty IPS");
    // Set pregnancy status based on IPS Patient resource
    ips.entry.forEach((element) => {
        if (element.resource.resourceType == "Patient") {
            gender = element.resource.gender;
            console.log(("gender: " +gender));
            let age = getIPSAge(element.resource.birthDate);
            if (gender != "female" || age >= 60 || age < 14) {
                console.log("Patient is not of childbearing age");
                pregnancyStatus.childbearingAge = false;
                enhanceTag = "collapsed";
            } else {
                pregnancyStatus.childbearingAge = true;
                enhanceTag = "highlight";
            }
        }
    });
    // Check IPS for pregnancy/breastfeeding status
    const now = new Date();
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(now.getFullYear() - 2);
    const tenMonthsFromNow = new Date();
    tenMonthsFromNow.setMonth(now.getMonth() + 10);
    ips.entry.forEach((entry) => {
        const resource = entry.resource;
        if (resource.resourceType === "Observation" && resource.code?.coding) {
            resource.code.coding.forEach((coding) => {
                const loincCode = coding.code;
                // Pregnancy status by valueDateTime
                if (loincCode === "11778-8" && resource.valueDateTime) {
                    const valueDate = new Date(resource.valueDateTime);
                    if (valueDate > now && valueDate <= tenMonthsFromNow) pregnancyStatus.pregnant = true;
                    if (valueDate < now && valueDate >= twoYearsAgo) pregnancyStatus.breastfeeding = true;
                }
                // Pregnancy status by valueCodeableConcept
                if (loincCode === "82810-3" && resource.valueCodeableConcept?.coding) {
                    resource.valueCodeableConcept.coding.forEach((coding) => {
                        const code = coding.code;
                        const positivePregnancyCodes = ["77386006", "146799005", "152231000119106"];
                        const negativePregnancyCodes = ["60001007"];
                        if (positivePregnancyCodes.includes(code)) pregnancyStatus.pregnant = true;
                        if (negativePregnancyCodes.includes(code)) pregnancyStatus.pregnant = false;
                    });
                }
            });
        }
    });
    console.log("Pregnancy status:", pregnancyStatus);
    // ePI translation from terminology codes to human-readable categories
    let compositions = 0;
    let categories = [];
    epi.entry.forEach((entry) => {
        if (entry.resource.resourceType == "Composition") {
            compositions++;
            entry.resource.extension.forEach((element) => {
                if (element.extension[1]?.url == "concept") {
                    if (element.extension[1].valueCodeableReference.concept != undefined) {
                        element.extension[1].valueCodeableReference.concept.coding.forEach((coding) => {
                            if (listOfCategoriesToSearch.includes(coding.code)) {
                                categories.push(element.extension[0].valueString);
                            }
                        });
                    }
                }
            });
        }
    });
    // Decide tag
    enhanceTag = pregnancyStatus.childbearingAge ? "highlight" : "collapse";
    if (compositions == 0) throw new Error('Bad ePI: no category "Composition" found');
    if (categories.length == 0) return htmlData;
    // Annotate HTML and return
    return await annotateHTMLsection(categories, enhanceTag);
};

// --- Explanation function: returns pregnancy status and report sentence in selected language ---
function explanation(lang = "en") {
    console.warn("⚠️ Pregnancy Lens: Explanation function called.");
    return {
        status: pregnancyStatus,
        message: getReport(lang)
    };
}

// --- Report function: returns only the report sentence in selected language ---
function report(lang = "en") {
    return getReport(lang);
}

// --- Exported API ---
return {
    enhance: enhance,
    getSpecification: getSpecification,
    explanation: explanation,
    report: report
};
// ...end of file...

