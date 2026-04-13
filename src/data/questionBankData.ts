
import { pharmacologyData } from './topics/pharmacology';
import { autonomicNervousSystemData } from './topics/autonomicNervousSystem';
import { centralNervousSystemData } from './topics/centralNervousSystem';
import { cardiovascularSystemData } from './topics/cardiovascularSystem';
import { respiratorySystemData } from './topics/respiratorySystem';
import { autacoidsData } from './topics/autacoids';
import { peripheralNervousSystemData } from './topics/peripheralNervousSystem';
import { hormonesData } from './topics/hormones';
import { gastrointestinalSystemData } from './topics/gastrointestinalSystem';
import { antiMicrobialDrugsData } from './topics/antiMicrobialDrugs';
import { neoplasticDrugsData } from './topics/neoplasticDrugs';
import { miscellaneousDrugsData } from './topics/miscellaneousDrugs';
import { pathologyData } from './topics/pathology';
import { microbiologyData } from './topics/microbiology';
import { forensicMedicineData } from './topics/forensicMedicine';
import { communityMedicineData } from './topics/communityMedicine';
import { generalMedicineData } from './topics/generalMedicine';
import { obstetricsGynaecologyData } from './topics/obstetricsGynaecology';
import { generalSurgeryData } from './topics/generalSurgery';
import { orthopaedicsData } from './topics/orthopaedics';
import { paediatricsData } from './topics/paediatrics';
import { anatomyData } from './topics/anatomy';
import { physiologyData } from './topics/physiology';
import { biochemistryData } from './topics/biochemistry';


// Create a structured hierarchy with all four years as main categories
export const QUESTION_BANK_DATA = {
  "first-year": {
    name: "First Year",
    subtopics: {
      "anatomy": anatomyData,
      "physiology": physiologyData,
      "biochemistry": biochemistryData
    }
  },
  "second-year": {
    name: "Second Year",
    subtopics: {
      "pharmacology": pharmacologyData,
      "pathology": pathologyData,
      "microbiology": microbiologyData
    }
  },
  "third-year": {
    name: "Third Year",
    subtopics: {
      "forensic-medicine": forensicMedicineData,
      "community-medicine": communityMedicineData
    }
  },
  "final-year": {
    name: "Final Year",
    subtopics: {
      "general-medicine": generalMedicineData,
      "obstetrics-gynaecology": obstetricsGynaecologyData,
      "general-surgery": { ...generalSurgeryData, name: "General Surgery and Orthopaedics" },
      "paediatrics": paediatricsData
    }
  }
};
