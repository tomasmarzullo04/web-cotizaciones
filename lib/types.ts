export interface TechnicalParameters {
    projectDescription?: string;
    pipelinesCount: number;
    databricksUsage: 'none' | 'low' | 'high';
    criticality: 'low' | 'medium' | 'high';
    dataVolume: 'GB' | 'TB' | 'PB';
    updateFrequency: 'daily' | 'hourly' | 'realtime';
    sourceSystemsCount: number;
    securityCompliance: 'standard' | 'strict'; // e.g. PII
    usersCount: number;
    reportComplexity: 'low' | 'medium' | 'high';
    aiFeatures: boolean;
}

export interface CostBreakdown {
    roles: {
        role: string;
        count: number;
        hours: number;
        cost: number;
    }[];
    totalMonthlyCost: number;
    diagramCode: string;
}
