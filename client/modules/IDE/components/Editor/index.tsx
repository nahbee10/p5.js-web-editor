import { autocompletion, completeFromList } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching, syntaxHighlighting } from '@codemirror/language';
import { linter, lintGutter } from '@codemirror/lint';
import {
  openSearchPanel,
  replaceNext,
  search,
  searchKeymap
} from '@codemirror/search';
import { Compartment } from '@codemirror/state';
import {
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers
} from '@codemirror/view';
import {
  EmmetKnownSyntax,
  abbreviationTracker,
  emmetConfig,
  expandAbbreviation
} from '@emmetio/codemirror6-plugin';
import { classHighlighter } from '@lezer/highlight';
import classNames from 'classnames';
import { debounce } from 'lodash';
import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch } from 'react-redux';
// @ts-ignore
import {
  p5FunctionKeywords,
  p5VariableKeywords
  // @ts-ignore
} from '../../../../utils/p5-keywords';
// @ts-ignore
import CodeMirrorSearch from '../../../CodeMirror/CodeMirrorSearch';
// @ts-ignore
import CoreStyled from '../../../CodeMirror/CoreStyled';
// @ts-ignore
import p5StylePlugin from '../../../CodeMirror/highlightP5Vars';
// @ts-ignore
import tidyCode from '../../../CodeMirror/tidyCode';
// @ts-ignore
import { metaKey } from '../../../../utils/metaKey';
// @ts-ignore
import { getLanguageSupport } from '../../../CodeMirror/language';
// @ts-ignore
import lintSource from '../../../CodeMirror/linting';

const INDENTATION_AMOUNT = 2;

const p5AutocompleteSource = completeFromList(
  Object.keys(p5FunctionKeywords)
    .map((keyword) => ({
      label: keyword,
      type: 'function',
      boost: 99
    }))
    .concat(
      Object.keys(p5VariableKeywords).map((keyword) => ({
        label: keyword,
        type: 'constant',
        boost: 50
      }))
    )
);

const p5AutocompleteExt = autocompletion({
  override: [p5AutocompleteSource]
});

const searchContainer = document.createElement('div');
searchContainer.id = 'p5-search-panel';

interface EditorNewProps {
  provideController: (controller: any) => void;
}

const EditorNew: React.FC<EditorNewProps> = ({ provideController }) => {
  const dispatch = useDispatch();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);

  const compartments = useRef({
    language: new Compartment(),
    lineWrap: new Compartment(),
    lineNumbers: new Compartment(),
    emmet: new Compartment(),
    abbrTracker: new Compartment()
  });

  const tidyCodeHandler = () => {
    if (editorRef.current) {
      tidyCode(editorRef.current, 'js');
    }
  };

  const showFind = () => {
    if (editorRef.current) {
      openSearchPanel(editorRef.current);
    }
  };

  const showReplace = () => {
    if (editorRef.current) {
      replaceNext(editorRef.current);
    }
  };

  const getContent = () => {
    if (editorRef.current) {
      return {
        content: editorRef.current.state.doc.toString()
      };
    }
    return {
      content: ''
    };
  };

  const replaceFileContent = (content: string) => {
    if (editorRef.current) {
      editorRef.current.dispatch({
        changes: {
          from: 0,
          to: editorRef.current.state.doc.length,
          insert: content
        }
      });
    }
  };

  useEffect(() => {
    const currentLangSupport = getLanguageSupport('js');
    editorRef.current = new EditorView({
      extensions: [
        history(),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          {
            key: 'Mod-e',
            run: expandAbbreviation
          }
        ]),
        compartments.current.language.of(currentLangSupport),
        compartments.current.lineNumbers.of(lineNumbers()),
        compartments.current.emmet.of(
          emmetConfig.of({ syntax: EmmetKnownSyntax.jsx })
        ),
        compartments.current.abbrTracker.of(
          abbreviationTracker({ syntax: EmmetKnownSyntax.jsx })
        ),
        syntaxHighlighting(classHighlighter),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        p5AutocompleteExt,
        p5StylePlugin,
        bracketMatching(),
        linter(lintSource),
        lintGutter(),
        search({
          top: true,
          createPanel: () => ({ dom: searchContainer })
        })
      ],
      parent: containerRef.current!
    });

    provideController({
      tidyCode: tidyCodeHandler,
      showFind,
      showReplace,
      getContent
    });

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
      provideController(null);
    };
  }, [provideController]);

  return (
    <>
      {/* @ts-ignore */}
      <CoreStyled ref={containerRef} className="editor-holder" />
      {editorRef.current &&
        createPortal(
          <div className="CodeMirror-dialog CodeMirror-dialog-top">
            {/* @ts-ignore */}
            <CodeMirrorSearch editor={editorRef.current} />
          </div>,
          searchContainer
        )}
    </>
  );
};

export default EditorNew;
