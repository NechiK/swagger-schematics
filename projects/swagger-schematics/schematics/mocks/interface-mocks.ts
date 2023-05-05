export const CLAIM_VIEW_DTO_CONTENT_MOCK: string = `import { TClaimStatuses } from '../enums/claim-statuses.enum'
import { TClaimStages } from '../enums/claim-stages.enum'
import { TClaimType } from '../enums/claim-type.enum'

export interface IClaimViewDTO {
  id: number;
  claimNumber: string;
  claimStatus: TClaimStatuses;
  claimStage: TClaimStages;
  claimType: TClaimType;
  dateOpen: string;
  submitterFirstName: string;
  submitterLastName: string;
  submitterEmail: string;
  submitterPhone: string;
  isFlaggedForRetailerReview: boolean;
  escalation: number;
  furnitureStreetAddress1: string;
  furnitureStreetAddress2: string;
  furnitureCity: string;
  furniturePostalCode: string;
  furnitureCountry: string;
  furnitureProvince: string;
  dateClosed: string;
}
`;
