import { IApiModel, TTypeModel } from './api-model';

/**
 * breaking: code written against the previous generation may stop compiling or
 * behave differently. added: new surface, existing code is unaffected.
 */
export type TApiChangeSeverity = 'breaking' | 'added';

export interface IApiChange {
    severity: TApiChangeSeverity;
    /** What happened, e.g. `Endpoint removed`, `Property changed` */
    kind: string;
    /** What it happened to, e.g. `DELETE /api/Orders/{id}`, `IOrderDto.total` */
    subject: string;
    /** Where the subject lives or how it reads, e.g. `OrdersApiService.delete()`, `roles?: IRoleDto[]` */
    ref?: string;
    /** For changes: the previous and the new form */
    from?: string;
    to?: string;
}

const KIND_LABEL: Record<TTypeModel['kind'], string> = {
    'interface': 'Interface',
    'enum': 'Enum',
    'type-alias': 'Type'
};

/** Everything that differs between two generations of the API, breaking changes first. */
export function diffApiModels(previous: IApiModel, current: IApiModel): IApiChange[] {
    const changes = [
        ...diffTypes(previous.types, current.types),
        ...diffEndpoints(previous.endpoints, current.endpoints)
    ];
    // Stable: keeps types before endpoints within each severity
    return [
        ...changes.filter(change => change.severity === 'breaking'),
        ...changes.filter(change => change.severity === 'added')
    ];
}

function sortedUnion(a: object, b: object): string[] {
    return Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).sort();
}

function diffTypes(previous: IApiModel['types'], current: IApiModel['types']): IApiChange[] {
    return sortedUnion(previous, current).flatMap((symbol): IApiChange[] => {
        const before = previous[symbol];
        const after = current[symbol];

        if (!after) {
            return [{ severity: 'breaking', kind: `${KIND_LABEL[before.kind]} removed`, subject: symbol }];
        }
        if (!before) {
            return [{ severity: 'added', kind: `${KIND_LABEL[after.kind]} added`, subject: symbol }];
        }
        if (before.kind !== after.kind) {
            return [{
                severity: 'breaking',
                kind: 'Type changed',
                subject: symbol,
                from: KIND_LABEL[before.kind].toLowerCase(),
                to: KIND_LABEL[after.kind].toLowerCase()
            }];
        }
        if (before.kind === 'interface' && after.kind === 'interface') {
            return diffMembers(symbol, before.properties, after.properties, 'Property');
        }
        if (before.kind === 'enum' && after.kind === 'enum') {
            return diffMembers(symbol, before.members, after.members, 'Enum member');
        }
        if (before.kind === 'type-alias' && after.kind === 'type-alias' && before.expression !== after.expression) {
            return [{ severity: 'breaking', kind: 'Type changed', subject: symbol, from: before.expression, to: after.expression }];
        }
        return [];
    });
}

function diffMembers(owner: string, previous: Record<string, string>, current: Record<string, string>, label: string): IApiChange[] {
    return sortedUnion(previous, current).flatMap((name): IApiChange[] => {
        const subject = `${owner}.${name}`;
        if (!(name in current)) {
            return [{ severity: 'breaking', kind: `${label} removed`, subject }];
        }
        if (!(name in previous)) {
            return [{ severity: 'added', kind: `${label} added`, subject, ref: current[name] }];
        }
        if (previous[name] !== current[name]) {
            return [{ severity: 'breaking', kind: `${label} changed`, subject, from: previous[name], to: current[name] }];
        }
        return [];
    });
}

function diffEndpoints(previous: IApiModel['endpoints'], current: IApiModel['endpoints']): IApiChange[] {
    return sortedUnion(previous, current).flatMap((label): IApiChange[] => {
        const before = previous[label];
        const after = current[label];

        if (!after) {
            return [{ severity: 'breaking', kind: 'Endpoint removed', subject: label, ref: before.symbol }];
        }
        if (!before) {
            return [{ severity: 'added', kind: 'Endpoint added', subject: label, ref: after.symbol }];
        }
        if (before.symbol !== after.symbol) {
            // Renamed method (or controller): show where it lived and where it lives now
            return [{
                severity: 'breaking',
                kind: 'Endpoint changed',
                subject: label,
                from: `${before.symbol} ${before.signature}`,
                to: `${after.symbol} ${after.signature}`
            }];
        }
        if (before.signature !== after.signature) {
            return [{
                severity: 'breaking',
                kind: 'Endpoint changed',
                subject: label,
                ref: after.symbol,
                from: before.signature,
                to: after.signature
            }];
        }
        return [];
    });
}
