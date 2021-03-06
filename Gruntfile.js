// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
const sass = require('node-sass');
const path = require('path');
const targets = require('./targets.config');
const merge = require('lodash/merge');
const yaml = require('js-yaml');

module.exports = function(grunt) {
    const extensionPath = 'extension';

    const packageReportPath = path.join('package', 'report');
    const packageReportBundlePath = path.join(packageReportPath, 'bundle');
    const packageReportDropPath = path.join(packageReportPath, 'drop');

    function mustExist(file, reason) {
        const normalizedFile = path.normalize(file);
        if (!grunt.file.exists(normalizedFile)) {
            grunt.fail.fatal(`Missing required file ${normalizedFile}\n${reason}`);
        }
    }

    grunt.initConfig({
        bom: {
            cwd: path.resolve('./src/**/*.{ts,tsx,js,snap,html,scss,css}'),
        },
        clean: {
            intermediates: ['dist', extensionPath],
        },
        concurrent: {
            'webpack-all': ['exec:webpack-dev', 'exec:webpack-unified', 'exec:webpack-prod'],
        },
        copy: {
            code: {
                files: [
                    {
                        cwd: './src',
                        src: ['manifest.json'],
                        dest: extensionPath,
                        expand: true,
                    },
                    {
                        cwd: './src',
                        src: ['./**/*.html', '!./tests/**/*'],
                        dest: extensionPath,
                        expand: true,
                    },
                ],
            },
            images: {
                files: [
                    {
                        cwd: './src',
                        src: ['./**/*.{png,ico,icns}', '!./tests/**/*'],
                        dest: extensionPath,
                        expand: true,
                    },
                ],
            },
            styles: {
                files: [
                    {
                        cwd: './src',
                        src: '**/*.css',
                        dest: extensionPath,
                        expand: true,
                    },
                    {
                        cwd: './dist/src/reports',
                        src: '*.css',
                        dest: path.join(extensionPath, 'reports'),
                        expand: true,
                    },
                    {
                        cwd: './dist/src/views',
                        src: '**/*.css',
                        dest: path.join(extensionPath, 'views'),
                        expand: true,
                    },
                    {
                        cwd: './dist/src/DetailsView/Styles',
                        src: '*.css',
                        dest: path.join(extensionPath, 'DetailsView/styles/default'),
                        expand: true,
                    },
                    {
                        cwd: './dist/src/electron/views/device-connect-view',
                        src: '*.css',
                        dest: path.join(
                            extensionPath,
                            'electron/views/device-connect-view/styles/default',
                        ),
                        expand: true,
                    },
                    {
                        cwd: './dist/src/injected/styles',
                        src: '*.css',
                        dest: path.join(extensionPath, 'injected/styles/default'),
                        expand: true,
                    },
                    {
                        cwd: './dist/src/popup/Styles',
                        src: '*.css',
                        dest: path.join(extensionPath, 'popup/styles/default'),
                        expand: true,
                    },
                    {
                        cwd: './node_modules/office-ui-fabric-react/dist/css',
                        src: 'fabric.min.css',
                        dest: path.join(extensionPath, 'common/styles/'),
                        expand: true,
                    },
                ],
            },
            'package-report': {
                files: [
                    {
                        cwd: '.',
                        src: path.join(packageReportBundlePath, 'report.bundle.js'),
                        dest: path.join(packageReportDropPath, 'index.js'),
                    },
                    {
                        cwd: '.',
                        src: './src/reports/package/accessibilityInsightsReport.d.ts',
                        dest: path.join(packageReportDropPath, 'index.d.ts'),
                    },
                    {
                        cwd: './src/reports/package/root',
                        src: '*',
                        dest: packageReportDropPath,
                        expand: true,
                    },
                ],
            },
        },
        exec: {
            'webpack-dev': `"${path.resolve('./node_modules/.bin/webpack')}" --config-name dev`,
            'webpack-prod': `"${path.resolve('./node_modules/.bin/webpack')}" --config-name prod`,
            'webpack-unified': `"${path.resolve(
                './node_modules/.bin/webpack',
            )}" --config-name unified`,
            'webpack-package-report': `"${path.resolve(
                './node_modules/.bin/webpack',
            )}" --config-name package-report`,
            'generate-scss-typings': `"${path.resolve('./node_modules/.bin/tsm')}" src`,
        },
        sass: {
            options: {
                implementation: sass,
                outputStyle: 'expanded',
            },
            dist: {
                files: [
                    {
                        src: 'src/**/*.scss',
                        dest: 'dist',
                        expand: true,
                        ext: '.css',
                    },
                ],
            },
        },
        'embed-styles': {
            'package-report': {
                cwd: packageReportBundlePath,
                src: '**/*bundle.js',
                dest: packageReportBundlePath,
                expand: true,
                cssPath: path.resolve('extension', 'prodBundle'),
            },
        },
        watch: {
            images: {
                files: ['src/**/*.{png,ico,icns}'],
                tasks: ['copy:images', 'drop:dev', 'drop:unified-dev'],
            },
            'non-webpack-code': {
                files: ['src/**/*.html', 'src/manifest.json'],
                tasks: ['copy:code', 'drop:dev', 'drop:unified-dev'],
            },
            scss: {
                files: ['src/**/*.scss'],
                tasks: ['sass', 'copy:styles', 'drop:dev', 'drop:unified-dev'],
            },
            // We assume webpack --watch is running separately (usually via 'yarn watch')
            'webpack-dev-output': {
                files: ['extension/devBundle/**/*.*'],
                tasks: ['drop:dev'],
            },
            'webpack-unified-output': {
                files: ['extension/unifiedBundle/**/*.*'],
                tasks: ['drop:unified-dev'],
            },
        },
    });

    const targetNames = Object.keys(targets);
    const releaseTargets = Object.keys(targets).filter(t => targets[t].release);
    const extensionReleaseTargets = releaseTargets.filter(
        t => targets[t].config.options.productCategory === 'extension',
    );
    const unifiedReleaseTargets = releaseTargets.filter(
        t => targets[t].config.options.productCategory === 'electron',
    );

    unifiedReleaseTargets.forEach(targetName => {
        const { config, appId, publishUrl } = targets[targetName];
        const { electronIconBaseName, fullName, productCategory } = config.options;
        const dropPath = `drop/${productCategory}/${targetName}`;

        grunt.config.merge({
            'configure-electron-builder': {
                [targetName]: {
                    dropPath,
                    electronIconBaseName,
                    fullName,
                    appId,
                    publishUrl,
                },
            },
            'electron-builder-pack': {
                [targetName]: {
                    dropPath: dropPath,
                },
            },
            'unified-release-drop': {
                [targetName]: {
                    // empty on purpose
                },
            },
            'zip-mac-folder': {
                [targetName]: {
                    dropPath: dropPath,
                },
            },
        });
    });

    targetNames.forEach(targetName => {
        const { config, bundleFolder, telemetryKeyIdentifier } = targets[targetName];

        const { productCategory } = config.options;

        const dropPath = path.join(`drop/${productCategory}`, targetName);
        const dropExtensionPath = path.join(dropPath, 'product');

        grunt.config.merge({
            drop: {
                [targetName]: {
                    // empty on purpose
                },
            },
            configure: {
                [targetName]: {
                    configJSPath: path.join(dropExtensionPath, 'insights.config.js'),
                    configJSONPath: path.join(dropExtensionPath, 'insights.config.json'),
                    config,
                    telemetryKeyIdentifier,
                },
            },
            manifest: {
                [targetName]: {
                    manifestSrc: path.join('src', 'manifest.json'),
                    manifestDest: path.join(dropExtensionPath, 'manifest.json'),
                    config,
                },
            },
            clean: {
                [targetName]: dropPath,
                'package-report': packageReportDropPath,
                scss: path.join('src', '**/*.scss.d.ts'),
            },
            'embed-styles': {
                [targetName]: {
                    cwd: path.resolve(extensionPath, bundleFolder),
                    src: '**/*bundle.js',
                    dest: path.resolve(extensionPath, bundleFolder),
                    cssPath: path.resolve(extensionPath, bundleFolder),
                    expand: true,
                },
            },
            copy: {
                [targetName]: {
                    files: [
                        {
                            cwd: path.resolve(extensionPath, bundleFolder),
                            src: ['*.js', '*.js.map', '*.css'],
                            dest: path.resolve(dropExtensionPath, 'bundle'),
                            expand: true,
                        },
                        {
                            cwd: extensionPath,
                            src: ['**/*.{png,icns,ico,css,woff}'],
                            dest: dropExtensionPath,
                            expand: true,
                        },
                        {
                            cwd: 'deploy',
                            src: ['Gruntfile.js', 'package.json'],
                            dest: dropPath,
                            expand: true,
                        },
                        {
                            cwd: extensionPath,
                            src: ['**/*.html'],
                            dest: dropExtensionPath,
                            expand: true,
                        },
                    ],
                },
            },
        });
    });

    grunt.loadNpmTasks('grunt-bom-removal');
    grunt.loadNpmTasks('grunt-concurrent');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-exec');
    grunt.loadNpmTasks('grunt-sass');

    grunt.registerMultiTask('embed-styles', function() {
        const { cssPath } = this.data;
        this.files.forEach(file => {
            const {
                src: [src],
                dest,
            } = file;
            grunt.log.writeln(`embedding style in ${src}`);
            const fileOptions = { options: { encoding: 'utf8' } };
            const input = grunt.file.read(src, fileOptions);
            const rex = /\<\<CSS:([a-zA-Z\-\.\/]+)\>\>/g;
            const output = input.replace(rex, (_, cssName) => {
                const cssFile = path.resolve(cssPath, cssName);
                grunt.log.writeln(`    embedding from ${cssFile}`);
                const styles = grunt.file.read(cssFile, fileOptions);
                return styles.replace(/\n/g, '\\\n');
            });
            grunt.file.write(dest, output, fileOptions);
            grunt.log.writeln(`    written to ${dest}`);
        });
    });

    grunt.registerMultiTask('configure', function() {
        const { config, configJSONPath, configJSPath, telemetryKeyIdentifier } = this.data;
        // We pass this as an option from a build variable not because it is a secret
        // (it can be found easily enough from released builds), but to make it harder
        // to accidentally pollute release telemetry with data from local builds.
        if (telemetryKeyIdentifier && grunt.option(telemetryKeyIdentifier)) {
            config.options.appInsightsInstrumentationKey = grunt.option(telemetryKeyIdentifier);
        }

        const configJSON = JSON.stringify(config, undefined, 4);
        grunt.file.write(configJSONPath, configJSON);
        const copyrightHeader =
            '// Copyright (c) Microsoft Corporation. All rights reserved.\n// Licensed under the MIT License.\n';
        const configJS = `${copyrightHeader}window.insights = ${configJSON}`;
        grunt.file.write(configJSPath, configJS);
    });

    grunt.registerMultiTask('manifest', function() {
        const { config, manifestSrc, manifestDest } = this.data;
        const manifestJSON = grunt.file.readJSON(manifestSrc);
        merge(manifestJSON, {
            name: config.options.fullName,
            description: config.options.extensionDescription,
            icons: {
                '16': config.options.icon16,
                '48': config.options.icon48,
                '128': config.options.icon128,
            },
            browser_action: {
                default_icon: {
                    '20': config.options.icon16,
                    '40': config.options.icon48,
                },
            },
        });
        grunt.file.write(manifestDest, JSON.stringify(manifestJSON, undefined, 2));
    });

    grunt.registerMultiTask('drop', function() {
        const targetName = this.target;
        const { bundleFolder, mustExistFile, config } = targets[targetName];

        const { productCategory } = config.options;

        const dropPath = path.join(`drop/${productCategory}`, targetName);
        const dropExtensionPath = path.join(dropPath, 'product');

        const mustExistPath = path.join(extensionPath, bundleFolder, mustExistFile);

        mustExist(mustExistPath, 'Have you run webpack?');

        grunt.task.run('embed-styles:' + targetName);
        grunt.task.run('clean:' + targetName);
        grunt.task.run('copy:' + targetName);
        grunt.task.run('configure:' + targetName);
        grunt.task.run('manifest:' + targetName);
        console.log(`${targetName} extension is in ${dropExtensionPath}`);
    });

    grunt.registerMultiTask('configure-electron-builder', function() {
        grunt.task.requires('drop:' + this.target);
        const { dropPath, electronIconBaseName, fullName, appId, publishUrl } = this.data;

        const outElectronBuilderConfigFile = path.join(dropPath, 'electron-builder.yml');
        const srcElectronBuilderConfigFile = path.join(
            'src',
            'electron',
            'electron-builder',
            `electron-builder.template.yaml`,
        );

        const version = grunt.option('unified-version') || '0.0.0';

        const config = grunt.file.readYAML(srcElectronBuilderConfigFile);
        config.appId = appId;
        config.directories.app = dropPath;
        config.directories.output = `${dropPath}/packed`;
        config.extraMetadata.version = version;
        config.win.icon = `src/${electronIconBaseName}.ico`;
        // electron-builder infers the linux icon from the mac one
        config.mac.icon = `src/${electronIconBaseName}.icns`;
        config.publish.url = publishUrl;
        config.productName = fullName;
        config.extraMetadata.name = fullName;
        // This is necessary for the AppImage to display using our brand icon
        // See electron-userland/electron-builder#3547 and AppImage/AppImageKit#678
        config.linux.artifactName = fullName.replace(/ (- )?/g, '_') + '.${ext}';

        const configFileContent = yaml.safeDump(config);
        grunt.file.write(outElectronBuilderConfigFile, configFileContent);
        grunt.log.writeln(`generated ${outElectronBuilderConfigFile} from target config`);
    });

    grunt.registerMultiTask('electron-builder-pack', function() {
        grunt.task.requires('drop:' + this.target);
        grunt.task.requires('configure-electron-builder:' + this.target);

        const { dropPath } = this.data;
        const configFile = path.join(dropPath, 'electron-builder.yml');

        const taskDoneCallback = this.async();

        grunt.util.spawn(
            {
                cmd: 'node',
                args: [
                    'node_modules/electron-builder/out/cli/cli.js',
                    '-p',
                    'never',
                    '-c',
                    configFile,
                ],
            },
            (error, result, code) => {
                if (error) {
                    grunt.fail.fatal(
                        `electron-builder exited with error code ${code}:\n\n${result.stdout}`,
                        code,
                    );
                }

                taskDoneCallback();
            },
        );
    });

    grunt.registerMultiTask('zip-mac-folder', function() {
        grunt.task.requires('drop:' + this.target);
        grunt.task.requires('configure-electron-builder:' + this.target);
        grunt.task.requires('electron-builder-pack:' + this.target);

        // We found that the mac update fails unless we produce the
        // zip file ourselves; electron-builder requires a zip file, but
        // the zip file it produces leads to 'couldn't find pkzip signatures'
        // during the eventual update.

        if (process.platform !== 'darwin') {
            grunt.log.writeln(`task not required for this platform (${process.platform})`);
            return true;
        }

        const { dropPath } = this.data;
        const packedPath = `${dropPath}/packed`;

        const taskDoneCallback = this.async();

        grunt.util.spawn(
            {
                cmd: 'node',
                args: ['pipeline/scripts/zip-mac-folder.js', packedPath],
            },
            (error, result, code) => {
                if (error) {
                    grunt.fail.fatal(
                        `zipping mac folder exited with error code ${code}:\n\n${result.stdout}`,
                        code,
                    );
                }

                taskDoneCallback();
            },
        );
    });

    grunt.registerMultiTask('unified-release-drop', function() {
        grunt.task.run(`drop:${this.target}`);
        grunt.task.run(`configure-electron-builder:${this.target}`);
        grunt.task.run(`electron-builder-pack:${this.target}`);
        grunt.task.run(`zip-mac-folder:${this.target}`);
    });

    grunt.registerTask('package-report', function() {
        const mustExistPath = path.join(packageReportBundlePath, 'report.bundle.js');

        mustExist(mustExistPath, 'Have you run webpack?');

        grunt.task.run('embed-styles:package-report');
        grunt.task.run('clean:package-report');
        grunt.task.run('copy:package-report');
        console.log(`package is in ${packageReportDropPath}`);
    });

    grunt.registerTask('extension-release-drops', function() {
        extensionReleaseTargets.forEach(targetName => {
            grunt.task.run('drop:' + targetName);
        });
    });

    grunt.registerTask('unified-release-drops', function() {
        unifiedReleaseTargets.forEach(targetName => {
            grunt.task.run('unified-release-drop:' + targetName);
        });
    });

    grunt.registerTask('build-assets', ['sass', 'copy:code', 'copy:styles', 'copy:images']);

    // Main entry points for npm scripts:
    grunt.registerTask('build-dev', [
        'clean:intermediates',
        'exec:generate-scss-typings',
        'exec:webpack-dev',
        'build-assets',
        'drop:dev',
    ]);
    grunt.registerTask('build-prod', [
        'clean:intermediates',
        'exec:generate-scss-typings',
        'exec:webpack-prod',
        'build-assets',
        'drop:production',
    ]);
    grunt.registerTask('build-unified', [
        'clean:intermediates',
        'exec:generate-scss-typings',
        'exec:webpack-unified',
        'build-assets',
        'drop:unified-dev',
    ]);
    grunt.registerTask('build-unified-all', [
        'clean:intermediates',
        'exec:generate-scss-typings',
        'exec:webpack-unified',
        'build-assets',
        'drop:unified-dev',
        'unified-release-drops',
    ]);
    grunt.registerTask('build-package-report', [
        'clean:intermediates',
        'exec:generate-scss-typings',
        'exec:webpack-prod', // required to get the css assets
        'exec:webpack-package-report',
        'build-assets',
        'package-report',
    ]);
    grunt.registerTask('build-all', [
        'clean:intermediates',
        'exec:generate-scss-typings',
        'concurrent:webpack-all',
        'build-assets',
        'drop:dev',
        'drop:unified-dev',
        'extension-release-drops',
    ]);

    grunt.registerTask('default', ['build-dev']);
};
