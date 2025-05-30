// eslint.config.js
import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactNative from "eslint-plugin-react-native";
import { FlatCompat } from '@eslint/eslintrc';
import path from 'path';
import { fileURLToPath } from 'url';
import babelParser from '@babel/eslint-parser'; // ¡Importación directa del parser!

// Definir __filename y __dirname para el contexto ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  pluginJs.configs.recommended,

  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    plugins: {
      react: pluginReact,
      'react-native': pluginReactNative,
    },
    languageOptions: {
      parser: babelParser, // Usar la importación directa del parser
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        // ¡Esta sección DEBE ESTAR ELIMINADA!
        // babelOptions: {
        //   presets: ['module:metro-react-native-babel-preset'],
        // },
      },
      globals: {
        ...globals.node,
        __DEV__: 'readonly',
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },

  {
    rules: {
      'react-native/no-raw-text': 'error',
      'react-native/no-unused-styles': 'warn',
      'react-native/no-inline-styles': 'warn',
      'react-native/no-color-literals': 'warn',

      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off', 
    },
  },
];