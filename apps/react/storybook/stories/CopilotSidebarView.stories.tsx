import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import {
  CopilotChatConfigurationProvider,
  CopilotModalHeader,
  CopilotSidebarView,
  type CopilotSidebarViewProps,
} from "@copilotkitnext/react";

const StoryWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <CopilotChatConfigurationProvider threadId="story-copilot-sidebar">
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 py-10">
        <section className="space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight">Project Dashboard</h1>
          <p className="text-muted-foreground">
            Toggle the assistant to draft updates, summarize discussions, and keep track of action items while you stay
            in context.
          </p>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <article
              key={index}
              className="rounded-xl border border-border bg-card p-4 shadow-sm transition hover:shadow-md"
            >
              <h2 className="text-lg font-medium">Task {index + 1}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Placeholder content to illustrate how the sidebar pushes the layout without overlapping.
              </p>
            </article>
          ))}
        </div>
      </div>

      {children}
    </div>
  </CopilotChatConfigurationProvider>
);

const meta = {
  title: "UI/CopilotSidebarView",
  component: CopilotSidebarView,
  parameters: {
    layout: "fullscreen",
  },
  render: (args) => (
    <StoryWrapper>
      <CopilotSidebarView {...(args as CopilotSidebarViewProps)} />
    </StoryWrapper>
  ),
} satisfies Meta<typeof CopilotSidebarView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    autoScroll: true,
  },
};

export const CustomHeader: Story = {
  args: {
    header: {
      title: "Workspace Copilot",
      titleContent: (props) => (
        <CopilotModalHeader.Title
          {...props}
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          <span>{props.children}</span>
          <span className="mt-1 block text-xs font-normal text-muted-foreground">
            Always-on teammate
          </span>
        </CopilotModalHeader.Title>
      ),
      closeButton: (props) => (
        <CopilotModalHeader.CloseButton
          {...props}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        />
      ),
    },
  },
};
