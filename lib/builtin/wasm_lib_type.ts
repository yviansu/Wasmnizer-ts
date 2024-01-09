interface PackedType {}
interface PackedType_Not_Packed extends PackedType {}
interface PackedType_I8 extends PackedType {}
interface PackedType_I16 extends PackedType {}

interface Mutability {}
interface Mutability_Immutable extends Mutability {}
interface Mutability_Mutable extends Mutability {}

interface Nullability {}
interface Nullability_NonNullable extends Nullability {}
interface Nullability_Nullable extends Nullability {}

class WASMArray<
    T,
    P extends PackedType,
    M extends Mutability,
    N extends Nullability,
> {
    elements: T[];
    packedType: P;
    mutable: M;
    nullable: N;

    constructor(elements: T[], packedType: P, mutable: M, nullable: N) {
        this.elements = elements;
        this.packedType = packedType;
        this.mutable = mutable;
        this.nullable = nullable;
    }

    static createWithDefaultValue<
        T,
        P extends PackedType,
        M extends Mutability,
        N extends Nullability,
    >() {
        return new WASMArray<T, P, M, N>([], {} as P, {} as M, {} as N);
    }

    callBuiltinMethod<T>(methodName: string, ...args: any[]) {
        // TODO
    }

    push(...items: T[]): number {
        return this.elements.push(...items);
    }
}

// eg.

const arr1 = WASMArray.createWithDefaultValue<
    number,
    PackedType_Not_Packed,
    Mutability_Mutable,
    Nullability_Nullable
>();
const arr2 = new WASMArray<
    number,
    PackedType_Not_Packed,
    Mutability_Mutable,
    Nullability_Nullable
>([1, 2], {}, {}, {});

arr1.push(1);
