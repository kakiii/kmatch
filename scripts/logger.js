#!/usr/bin/env node

/**
 * Shared logger utility for KMatch automation system
 *
 * USAGE GUIDELINES:
 * - Use logger for: technical progress, debugging, error handling, internal state
 * - Use console for: user banners, final summaries, visual formatting, direct user communication
 *
 * Examples:
 * - logger.info('Processing 150 records...') // Technical progress
 * - console.log('🎉 AUTOMATION COMPLETED!') // User-facing banner
 * - logger.error('Database connection failed:', error) // Technical error
 * - console.log('✅ Build completed successfully') // User status
 */

const CONFIG = require('./config');

/**
 * Logger class with different log levels
 */
class Logger {
  constructor(options = {}) {
    this.level = options.level || CONFIG.LOG_LEVEL || 'info';
    this.enableColors = options.colors !== false && process.stdout.isTTY;
  }

  /**
   * Log levels hierarchy
   */
  static get LEVELS() {
    return {
      debug: 0,
      info: 1,
      warning: 2,
      error: 3
    };
  }

  /**
   * Color codes for different log levels
   */
  static get COLORS() {
    return {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m', // Green
      warning: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
      reset: '\x1b[0m' // Reset
    };
  }

  /**
   * Check if a log level should be output
   * @param {string} level - Log level to check
   * @returns {boolean} Whether to output this level
   */
  shouldLog(level) {
    const currentLevel = Logger.LEVELS[this.level] || Logger.LEVELS.info;
    const messageLevel = Logger.LEVELS[level] || Logger.LEVELS.info;
    return messageLevel >= currentLevel;
  }

  /**
   * Format timestamp
   * @returns {string} Formatted timestamp
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Apply color to text if colors are enabled
   * @param {string} text - Text to colorize
   * @param {string} color - Color code
   * @returns {string} Colorized or plain text
   */
  colorize(text, color) {
    if (!this.enableColors) return text;
    return `${color}${text}${Logger.COLORS.reset}`;
  }

  /**
   * Core logging method
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {*} data - Optional data to log
   */
  log(level, message, data = null) {
    if (!this.shouldLog(level)) return;

    const timestamp = this.getTimestamp();
    const levelUpper = level.toUpperCase();
    const color = Logger.COLORS[level] || Logger.COLORS.reset;

    const coloredLevel = this.colorize(`[${levelUpper}]`, color);
    const logMessage = `[${timestamp}] ${coloredLevel} ${message}`;

    if (data !== null && data !== undefined) {
      if (typeof data === 'object') {
        console.log(logMessage, data);
      } else {
        console.log(`${logMessage} ${data}`);
      }
    } else {
      console.log(logMessage);
    }
  }

  /**
   * Debug level logging
   * @param {string} message - Log message
   * @param {*} data - Optional data
   */
  debug(message, data) {
    this.log('debug', message, data);
  }

  /**
   * Info level logging
   * @param {string} message - Log message
   * @param {*} data - Optional data
   */
  info(message, data) {
    this.log('info', message, data);
  }

  /**
   * Warning level logging
   * @param {string} message - Log message
   * @param {*} data - Optional data
   */
  warning(message, data) {
    this.log('warning', message, data);
  }

  /**
   * Error level logging
   * @param {string} message - Log message
   * @param {*} data - Optional data
   */
  error(message, data) {
    this.log('error', message, data);
  }
}

// Create and export a default logger instance
const logger = new Logger();

module.exports = logger;
module.exports.Logger = Logger;
