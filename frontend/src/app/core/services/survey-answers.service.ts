import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SurveyAnswers } from '../models/form-builder.model';

@Injectable({
  providedIn: 'root'
})
export class SurveyAnswersService {

  private surveyAnswersSubject = new BehaviorSubject<SurveyAnswers | null>(null);
  surveyAnswers$ = this.surveyAnswersSubject.asObservable();

  private currentRespondentId = 'respondent_' + Date.now();

  constructor() {
    // Intentar cargar respuestas del localStorage
    this.loadAnswersFromStorage();
  }

  /**
   * Obtiene el ID del respondente actual
   */
  getCurrentRespondentId(): string {
    return this.currentRespondentId;
  }

  /**
   * Guarda una respuesta de survey
   * Uso: this.saveSurveyAnswer('form_123', 'field_456', 4);
   */
  public saveSurveyAnswer(
    formDefinitionId: string,
    surveyFieldId: string,
    value: 1 | 2 | 3 | 4 | 5
  ): void {
    const currentAnswers = this.surveyAnswersSubject.value || {
      formDefinitionId,
      respondentId: this.currentRespondentId,
      answers: [],
      timestamp: new Date()
    };

    // Buscar si ya existe respuesta para este campo
    const existingAnswerIndex = currentAnswers.answers.findIndex(
      a => a.surveyFieldId === surveyFieldId
    );

    if (existingAnswerIndex > -1) {
      // Actualizar respuesta existente
      currentAnswers.answers[existingAnswerIndex].value = value;
    } else {
      // Agregar nueva respuesta
      currentAnswers.answers.push({
        surveyFieldId,
        value
      });
    }

    currentAnswers.timestamp = new Date();
    this.surveyAnswersSubject.next(currentAnswers);
    this.saveAnswersToStorage(currentAnswers);
  }

  /**
   * Obtiene la respuesta para un campo específico
   * Uso: const answer = this.getSurveyAnswer('field_456');
   */
  public getSurveyAnswer(surveyFieldId: string): 1 | 2 | 3 | 4 | 5 | null {
    const answers = this.surveyAnswersSubject.value;
    if (!answers) return null;

    const answer = answers.answers.find(a => a.surveyFieldId === surveyFieldId);
    return answer ? answer.value : null;
  }

  /**
   * Obtiene todas las respuestas guardadas
   * Uso: const allAnswers = this.getAllAnswers();
   */
  public getAllAnswers(): SurveyAnswers | null {
    return this.surveyAnswersSubject.value;
  }

  /**
   * Obtiene las respuestas para campos específicos
   * Uso: const answers = this.getAnswersForFields(['field_1', 'field_2']);
   */
  public getAnswersForFields(fieldIds: string[]): { [fieldId: string]: 1 | 2 | 3 | 4 | 5 } {
    const answers = this.surveyAnswersSubject.value;
    if (!answers) return {};

    const result: { [fieldId: string]: 1 | 2 | 3 | 4 | 5 } = {};

    fieldIds.forEach(fieldId => {
      const answer = answers.answers.find(a => a.surveyFieldId === fieldId);
      if (answer) {
        result[fieldId] = answer.value;
      }
    });

    return result;
  }

  /**
   * Inicia un nuevo formulario de respuestas
   * Uso: this.startNewSurvey('form_123');
   */
  public startNewSurvey(formDefinitionId: string): void {
    const newAnswers: SurveyAnswers = {
      formDefinitionId,
      respondentId: this.currentRespondentId,
      answers: [],
      timestamp: new Date()
    };

    this.surveyAnswersSubject.next(newAnswers);
    this.saveAnswersToStorage(newAnswers);
  }

  /**
   * Limpia todas las respuestas guardadas
   * Uso: this.clearAnswers();
   */
  public clearAnswers(): void {
    this.surveyAnswersSubject.next(null);
    localStorage.removeItem('survey_answers_' + this.currentRespondentId);
  }

  /**
   * Obtiene el promedio de respuestas
   * Uso: const avg = this.getAverageAnswer(['field_1', 'field_2']);
   */
  public getAverageAnswer(fieldIds: string[]): number {
    const answersForFields = this.getAnswersForFields(fieldIds);
    const values = Object.values(answersForFields);

    if (values.length === 0) return 0;

    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }

  // ========== PRIVATE: LocalStorage ==========

  /**
   * Guarda respuestas en localStorage
   */
  private saveAnswersToStorage(answers: SurveyAnswers): void {
    try {
      const key = 'survey_answers_' + this.currentRespondentId;
      localStorage.setItem(key, JSON.stringify(answers));
    } catch (error) {
      console.error('Error saving survey answers to localStorage:', error);
    }
  }

  /**
   * Carga respuestas desde localStorage
   */
  private loadAnswersFromStorage(): void {
    try {
      const key = 'survey_answers_' + this.currentRespondentId;
      const stored = localStorage.getItem(key);

      if (stored) {
        const answers = JSON.parse(stored) as SurveyAnswers;
        answers.timestamp = new Date(answers.timestamp);
        this.surveyAnswersSubject.next(answers);
      }
    } catch (error) {
      console.error('Error loading survey answers from localStorage:', error);
    }
  }

}
