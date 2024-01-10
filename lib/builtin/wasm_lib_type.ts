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

interface HasBaseType {}
interface HasBaseType_True extends HasBaseType {}
interface HasBaseType_False extends HasBaseType {}

type i32 = number;

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

    getElem(index: i32): T {
        return this.elements[index];
    }

    setElem(index: i32, elemValue: T) {
        this.elements[index] = elemValue;
    }

    push(...items: T[]): number {
        return this.elements.push(...items);
    }

    findIndex(
        predicate: (value: T, index: number, obj: T[]) => boolean,
    ): number {
        return this.elements.findIndex(predicate);
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
arr1.setElem(0, 10);
arr1.getElem(0);

class WASMStruct<
    T extends any[],
    P extends PackedType[],
    M extends Mutability[],
    N extends Nullability,
    B extends HasBaseType,
    T_B extends any[],
    P_B extends PackedType[],
    M_B extends Mutability[],
    N_B extends Nullability,
> {
    fields: T;
    packedTypes: P;
    mutables: M;
    nullable: N;
    hasBaseType: B;
    baseFields: T_B;
    basePackedTypes: P_B;
    baseMutables: M_B;
    baseNullable: N_B;

    constructor(
        fields: T,
        packedTypes: P,
        mutables: M,
        nullable: N,
        hasBaseType: B,
        baseFields: T_B,
        basePackedTypes: P_B,
        baseMutables: M_B,
        baseNullable: N_B,
    ) {
        this.fields = fields;
        this.packedTypes = packedTypes;
        this.mutables = mutables;
        this.nullable = nullable;
        this.hasBaseType = hasBaseType;
        this.baseFields = baseFields;
        this.basePackedTypes = basePackedTypes;
        this.baseMutables = baseMutables;
        this.baseNullable = baseNullable;
    }

    static createWithDefaultValue() {
        return new WASMStruct(
            [],
            [],
            [],
            {} as Nullability_Nullable,
            {} as HasBaseType_False,
            [],
            [],
            [],
            [],
        );
    }

    static createWithNoBaseType<
        T extends any[],
        P extends PackedType[],
        M extends Mutability[],
        N extends Nullability,
    >(fields: T, packedTypes: P, mutables: M, nullable: N) {
        return new WASMStruct(
            fields,
            packedTypes,
            mutables,
            nullable,
            {} as HasBaseType_False,
            [],
            [],
            [],
            [],
        );
    }

    getField<F>(index: i32): F {
        return this.fields[index];
    }

    setField<F>(index: i32, fieldValue: F) {
        this.fields[index] = fieldValue;
    }
}

// eg.
const struct1 = WASMStruct.createWithDefaultValue();
const struct2 = WASMStruct.createWithNoBaseType<
    [number, string],
    [PackedType_Not_Packed, PackedType_Not_Packed],
    [Mutability_Mutable, Mutability_Mutable],
    Nullability_Nullable
>([1, 'hi'], [{}, {}], [{}, {}], {});
struct1.setField<number>(0, 20);
struct1.getField<number>(0);

// eg. Map
// ts code
// const map_instance = new Map<number, string>();
// map_instance.set(1, 'hi');
// const value = map_instance.get(1);
const keys_arr = WASMArray.createWithDefaultValue<
    number,
    PackedType_Not_Packed,
    Mutability_Mutable,
    Nullability_Nullable
>();
const values_arr = WASMArray.createWithDefaultValue<
    string,
    PackedType_Not_Packed,
    Mutability_Mutable,
    Nullability_Nullable
>();
const map_instance = WASMStruct.createWithNoBaseType<
    [typeof keys_arr, typeof values_arr],
    [PackedType_Not_Packed, PackedType_Not_Packed],
    [Mutability_Mutable, Mutability_Mutable],
    Nullability_Nullable
>([keys_arr, values_arr], [{}, {}], [{}, {}], {});

keys_arr.push(1);
values_arr.push('hi');

const index = keys_arr.findIndex((value) => value === 1);
const value = values_arr.getElem(index);
