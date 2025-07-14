let pvData = pv;
let htmlData = html;

let epiData = epi;
let ipsData = ips;

let getSpecification = () => {
    return "1.0.0";
};

let pregnancyStatus = {
        childbearingAge: true,  // Assuming always true for now
        pregnant: false,
        breastfeeding: false
    };

let report = "you are seeing this because you are of childbearing age.";

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
                console.log("Response: " + response);
            } else {
                console.log("Response: " + document.documentElement.innerHTML);
                response = document.documentElement.innerHTML;
            }
        }
    });

    if (response == null || response == "") {
        throw new Error(
            "Annotation proccess failed: Returned empty or null response"
        );
        //return htmlData
    } else {
        console.log("Response: " + response);
        return response;
    }
}

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

let getIPSAge = (birthDate) => {
    let today = new Date();
    let birthDateParsed = new Date(birthDate);

    let ageMiliseconds = today - birthDateParsed;
    let age = Math.floor(ageMiliseconds / 31536000000);

    return age;
}

let enhance = async () => {
    //                  pregnancyCategory    breastfeedingCategory
    //                             SNOMED    SNOMED
    let listOfCategoriesToSearch = ["W78", "77386006", "69840006"]; //What to look in the extensions to find tag/class
    // Get IPS gender and check if is female
    let gender;
    let enhanceTag;

    if (ips == "" || ips == null) {
        throw new Error("Failed to load IPS: the LEE is getting a empty IPS");
    }


//    var report="you are seeing this because you are of childbearing age.";
    // original, just using age
    ips.entry.forEach((element) => {
        if (element.resource.resourceType == "Patient") {
            gender = element.resource.gender;
            if (gender != "female" || getIPSAge(element.resource.birthDate) >= 60 || getIPSAge(element.resource.birthDate) < 14) {
                pregnancyStatus.childbearingAge = false;
                enhanceTag = "collapsed";
            } else {
                pregnancyStatus.childbearingAge = true;
                enhanceTag = "highlight";
            }
        }
    });

    // check IPS for pregnancy status
    //        "display" : "Pregnancy status" - check  "valueCodeableConcept"
    //        "display" : "[#] Births total" - check valueQuantity
    //        "display" : "Delivery date Estimated" - check valueDatetime



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

                // Check for valueDateTime (e.g. 11778-8 or other future/breastfeeding)
                if (loincCode === "11778-8" && resource.valueDateTime) {
                    const valueDate = new Date(resource.valueDateTime);

                    if (valueDate > now && valueDate <= tenMonthsFromNow) {
                        pregnancyStatus.pregnant = true;
                    }

                    if (valueDate < now && valueDate >= twoYearsAgo) {
                        pregnancyStatus.breastfeeding = true;
                    }
                }

                // Check pregnancy status via valueCodeableConcept
                if (loincCode === "82810-3" && resource.valueCodeableConcept?.coding) {
                    resource.valueCodeableConcept.coding.forEach((coding) => {
                        const code = coding.code;

                        const positivePregnancyCodes = ["77386006", "146799005", "152231000119106"];
                        const negativePregnancyCodes = ["60001007"];

                        if (positivePregnancyCodes.includes(code)) {
                            pregnancyStatus.pregnant = true;
                        }

                        if (negativePregnancyCodes.includes(code)) {
                            pregnancyStatus.pregnant = false;
                        }
                    });
                }
            });
        }
    });
    console.log(enhanceTag);
    // ePI traslation from terminology codes to their human redable translations in the sections
    let compositions = 0;
    let categories = [];
    epi.entry.forEach((entry) => {
        if (entry.resource.resourceType == "Composition") {
            compositions++;
            //Iterated through the Condition element searching for conditions
            entry.resource.extension.forEach((element) => {

                // Check if the position of the extension[1] is correct
                if (element.extension[1].url == "concept") {
                    // Search through the different terminologies that may be avaible to check in the condition
                    if (element.extension[1].valueCodeableReference.concept != undefined) {
                        element.extension[1].valueCodeableReference.concept.coding.forEach(
                            (coding) => {
                                console.log("Extension: " + element.extension[0].valueString + ":" + coding.code)
                                // Check if the code is in the list of categories to search
                                if (listOfCategoriesToSearch.includes(coding.code)) {
                                    // Check if the category is already in the list of categories
                                    categories.push(element.extension[0].valueString);
                                }
                            }
                        );
                    }
                }
            });
        }
    });

    console.log(pregnancyStatus);
    // decide tag - currently as was:
    if (pregnancyStatus.childbearingAge == false) {
        enhanceTag = "collapse";
    }
    else {
        enhanceTag = "highlight";

    }


    if (compositions == 0) {
        throw new Error('Bad ePI: no category "Composition" found');
    }

    if (categories.length == 0) {
        // throw new Error("No categories found", categories);
        return htmlData;
    }
    //Focus (adds highlight class) the html applying every category found
    return await annotateHTMLsection(categories, enhanceTag);
    
};

return {
    enhance: enhance,
    getSpecification: getSpecification,
    explanation: pregnancyStatus,
    report: report
};

