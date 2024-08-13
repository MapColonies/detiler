#!/usr/bin/env node

import path from 'path';
import ts from 'typescript';

// see this thread for more info https://github.com/microsoft/TypeScript/issues/47387

//
// parse tsconfig.build.json
//

const configFilePath = ts.findConfigFile('./', ts.sys.fileExists, 'tsconfig.build.json');
const projectPath = path.resolve(path.dirname(configFilePath));
const configFile = ts.readConfigFile(configFilePath, ts.sys.readFile);

const compilerOptions = ts.parseJsonConfigFileContent(configFile.config, ts.sys, './', {
  incremental: true,
  tsBuildInfoFile: path.join(projectPath, 'type-check.tsbuildinfo'),

  // required to force emission of tsbuildinfo file(?)
  outDir: 'tmp',
  noEmit: true,
});

//
// setup program
//

const program = ts.createIncrementalProgram({
  rootNames: compilerOptions.fileNames,
  options: compilerOptions.options,
});

//
// run diagnostics and emit a tsbuildinfo for incremental type-checks
//

const preEmitDiagnostics = ts.getPreEmitDiagnostics(program);
const emitResult = program.emit();
const buildInfoEmitResult = program.emitBuildInfo();

const diagnostics = [...preEmitDiagnostics, ...emitResult.diagnostics, ...buildInfoEmitResult.diagnostics].filter(
  (it) => it.file.fileName.startsWith(projectPath + path.sep) && !it.file.fileName.includes('node_modules')
);

//
// setup reporter utilities
//

const errorCount = ts.getErrorCountForSummary(diagnostics);
const filesInError = ts.getFilesInErrorForSummary(diagnostics);
const diagnosticsReporter = ts.createDiagnosticReporter(ts.sys, true);

const reportDiagnostics = (diagnostics) => {
  for (const diagnostic of diagnostics) {
    diagnosticsReporter(diagnostic);
  }
};

const reportSummary = (errorCount, filesInError) => {
  console.log(ts.getErrorSummaryText(errorCount, filesInError, ts.sys.newLine, ts.sys));
};

//
// flush output to console
//

reportDiagnostics(diagnostics);
reportSummary(errorCount, filesInError);

process.exit(errorCount === 0 ? 0 : 1);
