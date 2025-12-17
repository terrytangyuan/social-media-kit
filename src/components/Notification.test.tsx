import { describe, it, expect } from '@jest/globals';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Notification } from './Notification';

describe('Notification Component', () => {
  describe('Visibility', () => {
    it('should not render when visible is false', () => {
      const { container } = render(
        <Notification visible={false} message="Test message" darkMode={false} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render when visible is true', () => {
      render(
        <Notification visible={true} message="Test message" darkMode={false} />
      );

      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
  });

  describe('Message Display', () => {
    it('should display the provided message', () => {
      render(
        <Notification visible={true} message="Success!" darkMode={false} />
      );

      expect(screen.getByText('Success!')).toBeInTheDocument();
    });

    it('should display error messages', () => {
      render(
        <Notification visible={true} message="❌ Error occurred" darkMode={false} />
      );

      expect(screen.getByText('❌ Error occurred')).toBeInTheDocument();
    });

    it('should display success messages', () => {
      render(
        <Notification visible={true} message="✅ Operation successful" darkMode={false} />
      );

      expect(screen.getByText('✅ Operation successful')).toBeInTheDocument();
    });

    it('should display long messages', () => {
      const longMessage = 'This is a very long message that contains a lot of text to test how the notification component handles lengthy content';
      render(
        <Notification visible={true} message={longMessage} darkMode={false} />
      );

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });
  });

  describe('Error Styling (Light Mode)', () => {
    it('should apply error styling for messages with ❌', () => {
      const { container } = render(
        <Notification visible={true} message="❌ Error" darkMode={false} />
      );

      const notification = container.querySelector('.px-4');
      expect(notification).toHaveClass('bg-red-100');
      expect(notification).toHaveClass('text-red-800');
      expect(notification).toHaveClass('border-red-300');
    });

    it('should detect error icon anywhere in message', () => {
      const { container } = render(
        <Notification visible={true} message="Failed ❌ to save" darkMode={false} />
      );

      const notification = container.querySelector('.px-4');
      expect(notification).toHaveClass('bg-red-100');
    });
  });

  describe('Success Styling (Light Mode)', () => {
    it('should apply success styling for messages without ❌', () => {
      const { container } = render(
        <Notification visible={true} message="Success!" darkMode={false} />
      );

      const notification = container.querySelector('.px-4');
      expect(notification).toHaveClass('bg-green-100');
      expect(notification).toHaveClass('text-green-800');
      expect(notification).toHaveClass('border-green-300');
    });

    it('should apply success styling for empty message', () => {
      const { container } = render(
        <Notification visible={true} message="" darkMode={false} />
      );

      const notification = container.querySelector('.px-4');
      expect(notification).toHaveClass('bg-green-100');
    });
  });

  describe('Error Styling (Dark Mode)', () => {
    it('should apply dark mode error styling for messages with ❌', () => {
      const { container } = render(
        <Notification visible={true} message="❌ Error" darkMode={true} />
      );

      const notification = container.querySelector('.px-4');
      expect(notification).toHaveClass('bg-red-800');
      expect(notification).toHaveClass('text-red-200');
      expect(notification).toHaveClass('border-red-600');
    });
  });

  describe('Success Styling (Dark Mode)', () => {
    it('should apply dark mode success styling for messages without ❌', () => {
      const { container } = render(
        <Notification visible={true} message="Success!" darkMode={true} />
      );

      const notification = container.querySelector('.px-4');
      expect(notification).toHaveClass('bg-green-800');
      expect(notification).toHaveClass('text-green-200');
      expect(notification).toHaveClass('border-green-600');
    });
  });

  describe('Positioning and Layout', () => {
    it('should have fixed positioning', () => {
      const { container } = render(
        <Notification visible={true} message="Test" darkMode={false} />
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('fixed');
      expect(wrapper).toHaveClass('top-4');
      expect(wrapper).toHaveClass('right-4');
    });

    it('should have high z-index for overlay', () => {
      const { container } = render(
        <Notification visible={true} message="Test" darkMode={false} />
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('z-50');
    });

    it('should have fade-in animation', () => {
      const { container } = render(
        <Notification visible={true} message="Test" darkMode={false} />
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('animate-fadeIn');
    });

    it('should have rounded corners', () => {
      const { container } = render(
        <Notification visible={true} message="Test" darkMode={false} />
      );

      const notification = container.querySelector('.px-4');
      expect(notification).toHaveClass('rounded-lg');
    });

    it('should have shadow', () => {
      const { container } = render(
        <Notification visible={true} message="Test" darkMode={false} />
      );

      const notification = container.querySelector('.px-4');
      expect(notification).toHaveClass('shadow-lg');
    });

    it('should have padding', () => {
      const { container } = render(
        <Notification visible={true} message="Test" darkMode={false} />
      );

      const notification = container.querySelector('.px-4');
      expect(notification).toHaveClass('px-4');
      expect(notification).toHaveClass('py-2');
    });

    it('should have border', () => {
      const { container } = render(
        <Notification visible={true} message="Test" darkMode={false} />
      );

      const notification = container.querySelector('.px-4');
      expect(notification).toHaveClass('border');
    });
  });

  describe('Edge Cases', () => {
    it('should handle messages with multiple ❌ symbols', () => {
      const { container } = render(
        <Notification visible={true} message="❌ Error ❌" darkMode={false} />
      );

      const notification = container.querySelector('.px-4');
      expect(notification).toHaveClass('bg-red-100');
    });

    it('should handle messages with special characters', () => {
      const message = 'Test <>&"';
      render(
        <Notification visible={true} message={message} darkMode={false} />
      );

      expect(screen.getByText(message)).toBeInTheDocument();
    });

    it('should handle messages with line breaks', () => {
      const message = "Line 1\nLine 2";
      const { container } = render(
        <Notification visible={true} message={message} darkMode={false} />
      );

      // Check that the container includes the message text (line breaks are preserved in textContent)
      const notification = container.querySelector('.px-4');
      expect(notification?.textContent).toContain('Line 1');
      expect(notification?.textContent).toContain('Line 2');
    });

    it('should toggle between light and dark mode', () => {
      const { container, rerender } = render(
        <Notification visible={true} message="Test" darkMode={false} />
      );

      let notification = container.querySelector('.px-4');
      expect(notification).toHaveClass('bg-green-100');

      rerender(
        <Notification visible={true} message="Test" darkMode={true} />
      );

      notification = container.querySelector('.px-4');
      expect(notification).toHaveClass('bg-green-800');
    });

    it('should toggle visibility', () => {
      const { container, rerender } = render(
        <Notification visible={true} message="Test" darkMode={false} />
      );

      expect(container.firstChild).not.toBeNull();

      rerender(
        <Notification visible={false} message="Test" darkMode={false} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should update message content', () => {
      const { rerender } = render(
        <Notification visible={true} message="First message" darkMode={false} />
      );

      expect(screen.getByText('First message')).toBeInTheDocument();

      rerender(
        <Notification visible={true} message="Second message" darkMode={false} />
      );

      expect(screen.queryByText('First message')).not.toBeInTheDocument();
      expect(screen.getByText('Second message')).toBeInTheDocument();
    });
  });
});
