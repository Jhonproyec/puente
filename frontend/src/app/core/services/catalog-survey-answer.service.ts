import { Injectable } from '@angular/core';

export interface CatalogQuestionAnswer {
  elementId: string;
  selectedIds: (string | number)[];
  score: number;
}

@Injectable({
  providedIn: 'root'
})

export class CatalogSurveyAnswerService {

  // Mapa de respuestas: elementId -> answer
  private answers = new Map<string, CatalogQuestionAnswer>();

  /**
   * Guarda la respuesta de una pregunta de catálogo
   * y calcula su puntuación automáticamente
   */
  saveAnswer(
    elementId: string,
    selectedIds: (string | number)[],
    totalOptions: number,
    noneIds: (string | number)[]
  ): void {
    const selectedNone = selectedIds.some(id => noneIds.includes(id));

    let score = 0;
    if (!selectedNone && totalOptions > 0) {
      // ✅ Excluir las opciones "ninguno" del denominador
      const validTotalOptions = totalOptions - noneIds.length;
      const validSelections = selectedIds.filter(id => !noneIds.includes(id));

      score = validTotalOptions > 0
        ? validSelections.length / validTotalOptions
        : 0;
    }

    this.answers.set(elementId, { elementId, selectedIds, score });
    console.log(`📊 Score calculado para ${elementId}: ${score} (${selectedIds.length}/${totalOptions - noneIds.length} opciones válidas)`);
  }

  /**
   * Obtiene la respuesta de una pregunta
   */
  getAnswer(elementId: string): CatalogQuestionAnswer | null {
    return this.answers.get(elementId) || null;
  }

  /**
   * Obtiene el score de una pregunta (0-1)
   */
  getScore(elementId: string): number {
    return this.answers.get(elementId)?.score || 0;
  }

  /**
   * Obtiene los IDs seleccionados de una pregunta
   */
  getSelectedIds(elementId: string): (string | number)[] {
    return this.answers.get(elementId)?.selectedIds || [];
  }

  /**
   * Calcula el subtotal de un grupo de preguntas (0-100)
   * Fórmula: (suma de scores) / total de preguntas * 100
   */
  calculateSubtotal(questionIds: string[]): number {
    if (questionIds.length === 0) return 0;

    const totalScore = questionIds.reduce((sum, id) => {
      return sum + this.getScore(id);
    }, 0);

    return (totalScore / questionIds.length) * 100;
  }

  /**
   * Calcula la ponderación general en estrellas
   * basada en múltiples subtotales
   */
  calculateStars(subtotalIds: string[], subtotalScores: Map<string, number>): number {
    if (subtotalIds.length === 0) return 0;

    const totalScore = subtotalIds.reduce((sum, id) => {
      return sum + (subtotalScores.get(id) || 0);
    }, 0);

    const average = totalScore / subtotalIds.length;
    return this.scoreToStars(average);
  }

  /**
   * Convierte un puntaje 0-100 a estrellas
   */
  scoreToStars(score: number): number {
    if (score === 100) return 5;
    if (score >= 76) return 4;
    if (score >= 51) return 3;
    if (score >= 26) return 2;
    return 1;
  }

  /**
   * Detecta si una opción es "ninguno/no aplica"
   * por su label, ignorando mayúsculas y tildes
   */
  isNoneOption(label: string): boolean {
    const normalized = label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    const noneKeywords = ['ninguno', 'ninguna', 'no aplica', 'no aplica', 'n/a', 'ninguno/a'];
    return noneKeywords.some(keyword => normalized === keyword);
  }

  /**
   * Limpia todas las respuestas (al cerrar el formulario)
   */
  clearAll(): void {
    this.answers.clear();
  }

  /**
   * Limpia la respuesta de un elemento específico
   */
  clearAnswer(elementId: string): void {
    this.answers.delete(elementId);
  }

  restoreAnswer(elementId: string, selectedIds: (string | number)[], score: number): void {
    this.answers.set(elementId, { elementId, selectedIds, score });
  }
}
