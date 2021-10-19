import { 
  ArrayNode,
  AST,
  ASTNode,
  AttributeNode,
  BlockNode,
  DictionaryNode,
  EOFNode,
  LiteralNode,
  LiteralType, 
  NodeType
} from "./ast";
import { Lexer } from "./lexer";
import { Token, TokenType } from "./token";

export class Parser {
  private tokens: Token[];
  private ast: AST;
  private currentToken: Token;
  private pc: number; // program counter

  constructor(lexer: Lexer) {
    this.ast = [];
    let token = lexer.nextToken();
    this.tokens = [];
    this.tokens.push(token);
    while (token.tokenType !== TokenType.EOF) {
      token = lexer.nextToken();
      this.tokens.push(token);
    }
    this.pc = 0;
    this.currentToken = this.tokens[this.pc];
    this.createAST();
  }

  private nextToken(): void {
    this.pc += 1;
    if (this.pc >= this.tokens.length) {
      this.currentToken = this.tokens[this.tokens.length - 1];
    }
    this.currentToken = this.tokens[this.pc];
  }

  private peekToken(i = 1): Token {
    if (this.pc + i >= this.tokens.length) {
      return this.tokens[this.tokens.length - 1];
    }
    return this.tokens[this.pc + i];
  }

  private nextNode(): ASTNode {
    while (this.currentToken.tokenType === TokenType.NEW_LINE) {
      this.nextToken();
    }
    switch(this.currentToken.tokenType) {
      case TokenType.SYMBOL: {
        return this.handleSymbol();
      }
      case TokenType.EOF: {
        return {
          type: NodeType.EOF_NODE,
          value: this.currentToken
        } as EOFNode;
      }
      default: {
        this.nextToken();
        // TODO handle unexpected
        return {} as ASTNode;
      }
    }
  }

  private handleSymbol(): AttributeNode | BlockNode {
    switch(this.peekToken().tokenType) {
      case TokenType.ASSIGNMENT_OP: {
        return this.handleAttribute();
      }
      case TokenType.STRING: {
        return this.handleBlockNode();
      }
      case TokenType.OPEN_BRACKET: {
        return this.handleBlockNode();
        break;
      }
      default: {
        // TODO change to handle unexpted token
        return this.handleAttribute();
      }
    }
  }

  private handleAttribute(): AttributeNode {
    const name = this.currentToken;
    this.nextToken();
    const assignmentOp = this.currentToken;
    this.nextToken();
    let value: ASTNode;
    switch (this.currentToken.tokenType) {
      case TokenType.STRING: {
        value = this.handleLiteralNode(LiteralType.STRING);
        break;
      }
      case TokenType.INTEGER: {
        value = this.handleLiteralNode(LiteralType.INTEGER);
        break;
      }
      case TokenType.DECIMAL: {
        value = this.handleLiteralNode(LiteralType.DECIMAL)
        break;
      }
      case TokenType.OPEN_BRACKET: {
        value = this.handleDictionaryNode();
        break;
      }
      case TokenType.OPEN_ARRAY: {
        value = this.handleArrayNode();
        break;
      }
      case TokenType.HEREDOC: {
        value = this.handleLiteralNode(LiteralType.HEREDOC);
        break;
      }
      case TokenType.INDENTED_HEREDOC: {
        value = this.handleLiteralNode(LiteralType.INDENTED_HEREDOC);
        break;
      }
      default: {
        // TODO handle unexpected token
        value = this.handleLiteralNode(LiteralType.STRING);
      }
    }
    const attributetNode: AttributeNode = {
      assignmentOp,
      name,
      type: NodeType.ATTRIBUTE_NODE,
      value: value,
      children: [value],
    };
    value.parent = attributetNode;
    this.nextToken();
    return attributetNode;
  }

  private handleLiteralNode(literalType: LiteralType): LiteralNode {
    // TODO handle if next token is not new line or EOF
    // TODO Handle errors in tokens errors
    return {
      literalType,
      type: NodeType.LITERAL_NODE,
      value: this.currentToken
    }
  }

  private handleDictionaryNode(): DictionaryNode {
    const blockStart = this.currentToken;
    this.nextToken();
    // TODO handle missing newline
    const entries: DictionaryNode["entries"] = [];
    while (this.currentToken.tokenType !== TokenType.CLOSE_BRACKET) {
      // TODO handle when token is not attibute
      if (this.currentToken.tokenType === TokenType.SYMBOL) {
        entries.push(this.handleAttribute());
      }
      this.nextToken();
    }
    const blockEnd = this.currentToken;
    this.nextToken();
    // TODO handle missing newline
    const dictionaryNode: DictionaryNode = {
      children: entries,
      blockStart,
      blockEnd,
      entries,
      type: NodeType.DICTIONARY_NODE
    };
    for (const attribute of entries) {
      attribute.parent = dictionaryNode;
    }
    return dictionaryNode;
  }

  public handleArrayNode(): ArrayNode {
    const arrayStart = this.currentToken;
    this.nextToken();
    // TODO handle unexpted token & newline
    const values: ArrayNode["values"] = [];
    while (this.currentToken.tokenType !== TokenType.CLOSE_ARRAY) {
      // TODO handle when token is not litteral or seperator
      switch (this.currentToken.tokenType) {
        case TokenType.STRING: {
          values.push(this.handleLiteralNode(LiteralType.STRING));
          break;
        }
        case TokenType.INTEGER: {
          values.push(this.handleLiteralNode(LiteralType.INTEGER));
          break;
        }
        case TokenType.DECIMAL: {
          values.push(this.handleLiteralNode(LiteralType.DECIMAL));
          break;
        }
        // case TokenType.OPEN_BRACKET: {
        //   values.push(this.handleDictionaryNode());
        //   break;
        // }
      }
      this.nextToken();
      // TODO handle missing seperator
      if (this.currentToken.tokenType === TokenType.ARRAY_ITEM_SEPERATOR) {
        this.nextToken();
      }

      // handle new lines correctly
      while (this.currentToken.tokenType === TokenType.NEW_LINE) {
        this.nextToken();
      }
      
    }
    // TODO handle when not closing token
    const arrayEnd = this.currentToken;
    this.nextToken();
    const arrayNode: ArrayNode = {
      children: values,
      type: NodeType.ARRAY_NODE,
      arrayStart,
      arrayEnd,
      values
    }
    for (const val of values) {
      val.parent = arrayNode;
    }
    return arrayNode;
  }

  private handleBlockNode(): BlockNode {
    const name = this.currentToken;
    this.nextToken();
    const lables: BlockNode["lables"] = [];
    while (this.currentToken.tokenType === TokenType.STRING) {
      lables.push(this.handleLiteralNode(LiteralType.STRING));
      this.nextToken();
    }
    if (this.currentToken.tokenType !== TokenType.OPEN_BRACKET) {
      // TODO handle missing open bracket
    }
    const blockStart = this.currentToken;
    this.nextToken();
    // TODO handle new line
    this.nextToken();
    const block: BlockNode["block"] = [];
    while (this.peekToken().tokenType !== TokenType.CLOSE_BRACKET) {
      block.push(this.nextNode());
    }
    this.nextToken();
    const blockEnd = this.currentToken;
    this.nextToken();
    const blockNode: BlockNode = {
      block,
      blockStart,
      blockEnd,
      children: block,
      type: NodeType.BLOCK_NODE,
      name,
    }
    if (lables.length > 0) {
      for (const lable of lables) {
        lable.parent = blockNode;
      }
      blockNode.lables = lables;
    }
    for (const astNode of block) {
      astNode.parent = blockNode;
    }
    return blockNode;
  }

  private createAST(): void {
    while (this.currentToken.tokenType !== TokenType.EOF) {
      this.ast.push(this.nextNode());
    }
  }

  public getAST() {
    return this.ast;
  }
}