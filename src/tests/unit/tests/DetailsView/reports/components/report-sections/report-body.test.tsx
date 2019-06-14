// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { shallow } from 'enzyme';
import * as React from 'react';
import { Mock } from 'typemoq';

import { NamedSFC } from '../../../../../../../common/react/named-sfc';
import { ReportBody, ReportBodyProps } from '../../../../../../../DetailsView/reports/components/report-sections/report-body';
import {
    ReportSectionFactory,
    SectionProps,
} from '../../../../../../../DetailsView/reports/components/report-sections/report-section-factory';
import { FixInstructionProcessor } from '../../../../../../../injected/fix-instruction-processor';

describe('ReportBody', () => {
    it('renders', () => {
        const pageTitle = 'page-title';
        const pageUrl = 'url:target-page';
        const getScriptStub = () => '';
        const getGuidanceTagsStub = () => [];
        const fixInstructionProcessorMock = Mock.ofType(FixInstructionProcessor);

        const detailsProps: SectionProps = {
            fixInstructionProcessor: fixInstructionProcessorMock.object,
            pageTitle,
            pageUrl,
            description: 'test description',
            scanDate: new Date('2019-05-29T19:12:16.804Z'),
            environmentInfo: {
                axeCoreVersion: 'axe-core-version',
                browserSpec: 'browser-spec',
                extensionVersion: 'extension-version',
            },
            scanResult: {
                passes: [],
                violations: [],
                inapplicable: [],
                incomplete: [],
                timestamp: 'today',
                targetPageTitle: pageTitle,
                targetPageUrl: pageUrl,
            },
            toUtcString: () => '',
            getCollapsibleScript: getScriptStub,
            getGuidanceTagsFromGuidanceLinks: getGuidanceTagsStub,
        };

        const props: ReportBodyProps = {
            sectionFactory: createSectionFactoryStub(),
            ...detailsProps,
        };

        const wrapper = shallow(<ReportBody {...props} />);

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    const createSectionFactoryStub = () => {
        const createBasicComponent = (name: string) => {
            return NamedSFC(name, () => {
                return <div />;
            });
        };

        const BodySection = createBasicComponent('body-section');
        const ContentContainer = createBasicComponent('content-container');
        const Header = createBasicComponent('header-section');
        const Title = createBasicComponent('title-section');
        const Summary = createBasicComponent('summary-section');
        const Details = createBasicComponent('details-section');
        const ResultSection = createBasicComponent('result-section');
        const FailedInstances = createBasicComponent('failed-instances-section');
        const PassedChecks = createBasicComponent('passed-checks-section');
        const NotApplicableChecks = createBasicComponent('not-applicable-checks-section');
        const Footer = createBasicComponent('footer-section');

        const sectionFactoryStub: ReportSectionFactory = {
            BodySection: BodySection,
            ContentContainer: ContentContainer,
            HeaderSection: Header,
            TitleSection: Title,
            SummarySection: Summary,
            DetailsSection: Details,
            ResultsContainer: ResultSection,
            FailedInstancesSection: FailedInstances,
            PassedChecksSection: PassedChecks,
            NotApplicableChecksSection: NotApplicableChecks,
            FooterSection: Footer,
        };

        return sectionFactoryStub;
    };
});
