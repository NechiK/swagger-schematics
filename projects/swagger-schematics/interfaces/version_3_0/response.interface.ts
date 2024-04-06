import { THttpStatusCode } from '../http-status-code.enum';
import { IContent } from './content.interface';

export interface IResponse {
    description: string;
    headers?: Record<string, any>;
    content?: IContent;
    links?: Record<string, any>;
}

export type TResponse = {
    [key in THttpStatusCode]?: IResponse;
};
