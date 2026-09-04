interface StableProps {
    value: string;
    registerEditor?: (api: unknown) => void;
}
interface WiringProps {
    spellcheckTest?: {
        createWorker?: () => unknown;
    };
}
interface Props extends StableProps, WiringProps {
}
declare const CompC: import("svelte").Component<Props, {}, "value">;
type CompC = ReturnType<typeof CompC>;
export default CompC;
