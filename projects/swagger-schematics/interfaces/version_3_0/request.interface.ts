import { IContent } from "./content.interface";

export interface IRequestBody {
    content: IContent;
    description?: string;
    required?: boolean;
}