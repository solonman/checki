import React from 'react';
import { AuthProvider } from './AuthContext';
import { ProjectProvider } from './ProjectContext';
import { FileProcessingProvider } from './FileProcessingContext';

/**
 * 统一上下文提供者组件
 * 组合所有上下文提供者，确保它们按正确的顺序嵌套
 */
export const ContextProvider = ({ children }) => {
  return (
    <AuthProvider>
      <ProjectProvider>
        <FileProcessingProvider>
          {children}
        </FileProcessingProvider>
      </ProjectProvider>
    </AuthProvider>
  );
};

export default ContextProvider;