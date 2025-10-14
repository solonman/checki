import { useTranslation } from '../context/i18nContext';
import { Card, Typography, Button, Row, Col, message } from 'antd';

const { Title, Paragraph, Text } = Typography;

/**
 * 多语言示例组件
 * 展示如何在应用中使用翻译功能
 */
const LanguageDemo = () => {
  const { t, language, changeLanguage, supportedLanguages } = useTranslation();
  
  // 切换语言的处理函数
  const handleLanguageChange = (newLanguage) => {
    changeLanguage(newLanguage);
    message.success(t('common.success'));
  };
  
  return (
    <Card title={t('common.info')} extra={<Text type="secondary">{t('common.currentLanguage')}: {language}</Text>}>
      <div className="language-demo">
        <Title level={4}>{t('common.languageDemoTitle') || '多语言示例'}</Title>
        <Paragraph>
          {t('common.languageDemoDescription') || '此组件演示如何在应用中使用多语言功能。您可以切换语言来查看效果。'}
        </Paragraph>
        
        <div className="language-selector">
          <Text strong>{t('settings.language')}:</Text>
          <Row gutter={8} style={{ marginTop: 8 }}>
            {supportedLanguages.map(lang => (
              <Col key={lang.value}>
                <Button 
                  type={language === lang.value ? "primary" : "default"}
                  onClick={() => handleLanguageChange(lang.value)}
                >
                  {lang.label}
                </Button>
              </Col>
            ))}
          </Row>
        </div>
        
        <div className="translation-examples">
          <Title level={5}>{t('common.exampleTranslations') || '翻译示例'}</Title>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            <li className="example-item">
              <Text mark>{t('upload.title')}</Text>
            </li>
            <li className="example-item">
              <Text mark>{t('result.proofreadingReport')}</Text>
            </li>
            <li className="example-item">
              <Text mark>{t('projects.projectManagement')}</Text>
            </li>
          </ul>
        </div>
      </div>
    </Card>
  );
};

export default LanguageDemo;