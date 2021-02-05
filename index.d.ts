export {};

declare global {
    interface WritableObject<DataType> {
        [key: string]: DataType;
    }
}
