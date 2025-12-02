import Decimal from 'decimal.js';

// Configurar precisão decimal para operações financeiras
// Precisão de 10 dígitos com arredondamento para cima no meio (padrão para moedas)
Decimal.set({
    precision: 10,
    rounding: Decimal.ROUND_HALF_UP,
    toExpNeg: -7,
    toExpPos: 7
});

/**
 * Classe utilitária para operações financeiras com precisão decimal
 * Usa Decimal.js para evitar erros de ponto flutuante em cálculos monetários
 */
export class DecimalMoney {
    /**
     * Soma dois valores monetários com precisão
     * @param a Primeiro valor (string ou number)
     * @param b Segundo valor (string ou number)
     * @returns String formatada com 2 casas decimais
     */
    static add(a: string | number, b: string | number): string {
        return new Decimal(a || 0).plus(b || 0).toFixed(2);
    }

    /**
     * Subtrai dois valores monetários com precisão
     * @param a Valor a ser subtraído (string ou number)
     * @param b Valor a subtrair (string ou number)
     * @returns String formatada com 2 casas decimais
     */
    static subtract(a: string | number, b: string | number): string {
        return new Decimal(a || 0).minus(b || 0).toFixed(2);
    }

    /**
     * Multiplica dois valores com precisão
     * @param a Primeiro valor (string ou number)
     * @param b Segundo valor (string ou number)
     * @returns String formatada com 2 casas decimais
     */
    static multiply(a: string | number, b: string | number): string {
        return new Decimal(a || 0).times(b || 0).toFixed(2);
    }

    /**
     * Divide dois valores com precisão
     * @param a Valor a ser dividido (string ou number)
     * @param b Divisor (string ou number)
     * @returns String formatada com 2 casas decimais
     * @throws Error se divisor for zero
     */
    static divide(a: string | number, b: string | number): string {
        if (new Decimal(b || 0).isZero()) {
            throw new Error('Division by zero');
        }
        return new Decimal(a || 0).dividedBy(b).toFixed(2);
    }

    /**
     * Soma um array de valores monetários
     * @param values Array de valores (string ou number)
     * @returns String formatada com 2 casas decimais
     */
    static sum(values: (string | number)[]): string {
        return values
            .reduce((acc, val) => new Decimal(acc).plus(val || 0), new Decimal(0))
            .toFixed(2);
    }

    /**
     * Compara dois valores monetários
     * @param a Primeiro valor (string ou number)
     * @param b Segundo valor (string ou number)
     * @returns -1 se a < b, 0 se a === b, 1 se a > b
     */
    static compare(a: string | number, b: string | number): number {
        return new Decimal(a || 0).comparedTo(b || 0);
    }

    /**
     * Verifica se valor é maior que outro
     * @param a Primeiro valor (string ou number)
     * @param b Segundo valor (string ou number)
     * @returns true se a > b
     */
    static isGreaterThan(a: string | number, b: string | number): boolean {
        return new Decimal(a || 0).greaterThan(b || 0);
    }

    /**
     * Verifica se valor é menor que outro
     * @param a Primeiro valor (string ou number)
     * @param b Segundo valor (string ou number)
     * @returns true se a < b
     */
    static isLessThan(a: string | number, b: string | number): boolean {
        return new Decimal(a || 0).lessThan(b || 0);
    }

    /**
     * Converte valor para número (use apenas para display, não para cálculos)
     * @param value Valor a converter (string ou number)
     * @returns Number com precisão decimal
     */
    static toNumber(value: string | number): number {
        return new Decimal(value || 0).toNumber();
    }

    /**
     * Formata valor como string com separadores de milhares
     * @param value Valor a formatar (string ou number)
     * @param locale Locale para formatação (padrão: pt-BR)
     * @returns String formatada
     */
    static format(value: string | number, locale: string = 'pt-BR'): string {
        const num = new Decimal(value || 0).toNumber();
        return num.toLocaleString(locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
}

// Exportar também a classe Decimal para uso direto quando necessário
export { Decimal };
