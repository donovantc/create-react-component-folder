#!/usr/bin/env node

const path = require('path');
const program = require('commander');
const chalk = require('chalk');
const logger = require('./logger');
const fs = require('./utils/fileHelpers');
const {
  createReactComponent,
  createReactFunctionalComponent,
  createReactNativeComponent,
  createTypeScriptReactComponent,
  createTypeScriptReactNativeComponent,
  createReactComponentWithProps,
  createReactFunctionalComponentWithProps,
  createReactNativeComponentWithProps,
  createIndex,
  createTest,
} = require('./data/componentData');
const format = require('./utils/format');
const clearConsole = require('./utils/clearConsole');
const stringHelper = require('./utils/stringHelper');
const checkVersion = require('./utils/checkVersion');
const { getComponentName, getComponentParentFolder } = require('./utils/componentsHelpers.js');
const removeNoneDir = require('./utils/removeNoneDir');
const isLetter = require('./utils/isLetter');
const removeOptionsFromArgs = require('./utils/removeOptionsFromArgs');
const createMultiIndex = require('./utils/createMultiIndex');
const logComponentTree = require('./utils/logComponentTree');
const validateArguments = require('./utils/validateArguments');

// Root directorys
const ROOT_DIR = process.cwd();
const PROJECT_ROOT_DIR = ROOT_DIR.substring(ROOT_DIR.lastIndexOf('/'), ROOT_DIR.length);

// Grab provided args
let [, , ...args] = process.argv;

// Set command line interface options for cli
program
  .version('0.1.0')
  .option('--typescript', 'Creates Typescript component and files')
  .option('--nocss', 'No css file')
  .option('--notest', 'No test file')
  .option('--reactnative', 'Creates React Native components')
  .option('--createindex', 'Creates index.js file for multple component imports')
  .option('-f, --functional', 'Creates React stateless functional component')
  .option('-j, --jsx', 'Creates the component file with .jsx extension')
  .option('-l, --less', 'Adds .less file to component')
  .option('-s, --scss', 'Adds .scss file to component')
  .option('-p, --proptypes', 'Adds prop-types to component')
  .option('-u, --uppercase', 'Component files start on uppercase letter')
  .parse(process.argv);

// Remove Node process args options
args = removeOptionsFromArgs(args);

/** 
 * Creates test files for react-shared 
 * @param {String} componentName - Component name
 * @param {String} componentPath - File system path to component
*/
function createTestFiles(componentName, componentPath) {
  return new Promise((resolve) => {
    // Directories
    const testDirectory = '__tests__';
    // File extension
    let name = componentName;
    const webExt = 'web.js';
    const nativeExt = 'native.js';

    // Test files
    const testExt = 'test'
    const testFileNameWeb = `${name}.${testExt}.${webExt}`;
    const testFileNameNative = `${name}.${testExt}.${nativeExt}`;

    // file names to create
    const files = [testFileNameWeb, testFileNameNative];

    // Auto Capitalize
    name = stringHelper.capitalizeFirstLetter(name);

    for (let i = 0; i < files.length; i += 1) {
      if (i !== 0) {
        files.splice(i, 1, stringHelper.capitalizeFirstLetter(files[i]));
      }
    }

    // Create component folder
    const componentTestDirPath = `${componentPath}/${testDirectory}`
    fs
      .createDirectorys(componentTestDirPath)
      .then(() => {
        const promises = [];

        for (let i = 0; i < files.length; i += 1) {
          const file = files[i];
          const filePath = path.join(componentTestDirPath, file);

          const data = createTest(name, program.uppercase);
          promises.push(fs.writeFileAsync(filePath, format.formatPrettier(data)));
        }

        Promise.all(promises).then(() => resolve({ dir: testDirectory, files }))
      })
      .catch((e) => {
        console.log(e);
        throw new Error('Error creating test files');
      });
  });
}

/** 
 * Creates files for react-shared 
 * @param {String} componentName - Component name
 * @param {String} componentPath - File system path to component
*/
function createFiles(componentName, componentPath) {
  return new Promise((resolve) => {
    // Directories
    const testDirectory = '__tests__';
    // File extension
    let name = componentName;
    const indexFile = `index.js`;
    const webExt = 'web.js';
    const nativeExt = 'native.js';
    const componentFileNameWeb = `${name}.${webExt}`;
    const componentFileNameNative = `${name}.${nativeExt}`;

    // file names to create
    const files = [indexFile, componentFileNameWeb, componentFileNameNative];

    // Auto Capitalize
    name = stringHelper.capitalizeFirstLetter(name);

    for (let i = 0; i < files.length; i += 1) {
      if (i !== 0) {
        files.splice(i, 1, stringHelper.capitalizeFirstLetter(files[i]));
      }
    }

    // Create component folder
    fs
      .createDirectorys(componentPath)
      .then(() => {
        const promises = [];

        for (let i = 0; i < files.length; i += 1) {
          const file = files[i];
          const filePath = path.join(componentPath, file);
          let data = '';

          if (file === indexFile) {
            data = createIndex(name, program.uppercase);
            promises.push(fs.writeFileAsync(filePath, format.formatPrettier(data)));
          } else if (file === `${name}.${webExt}`) {
            if (program.functional) {
              data = program.proptypes
                ? createReactFunctionalComponentWithProps(name)
                : createReactFunctionalComponent(name);
            } else if (program.proptypes) {
              data = createReactComponentWithProps(name);
            } else {
              data = createReactComponent(name);
            }
            promises.push(fs.writeFileAsync(filePath, format.formatPrettier(data)));
          } else if (file === `${name}.${nativeExt}`) {
            if (program.proptypes) {
              data = createReactNativeComponentWithProps(name);
            } else {
              data = createReactNativeComponent(name);
            }
            promises.push(fs.writeFileAsync(filePath, format.formatPrettier(data)));
          }
        }

        Promise.all(promises).then(() => resolve(files));
      })
      .catch((e) => {
        console.log(e);
        throw new Error('Error creating files');
      });
  });
}

/**
 * Initializes create react component
 */
function initialize() {
  // Start timer
  /* eslint-disable no-console */
  console.time('✨  Finished in');
  const promises = [];
  // Set component name, path and full path
  const componentPath = path.join(ROOT_DIR, args[0]);
  const folderPath = getComponentParentFolder(componentPath);

  const isValidArgs = validateArguments(args, program);

  if (!isValidArgs) {
    return;
  }

  fs
    .existsSyncAsync(componentPath)
    .then(() => {
      logger.animateStart('Creating components files...');

      for (let i = 0; i < args.length; i += 1) {
        const name = getComponentName(args[i]);
        promises.push(createFiles(name, folderPath + name));
        promises.push(createTestFiles(name, folderPath + name));
      }

      return Promise.all(promises);
    })
    .then(() => {
      logger.log(chalk.cyan('Created new React components at: ' + args[0]));
      // Stop animating in console
      logger.animateStop();
      // Stop timer
      console.timeEnd('✨  Finished in');
      // Log output to console
      logger.done('Success!');
    })
    .catch((error) => {
      if (error.message === 'false') {
        logger.error(`Folder already exists at ..${componentPath}`);
        return;
      }

      logger.error(error);
    });
}

// Start script
initialize();
