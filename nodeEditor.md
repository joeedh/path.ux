Design a full node editor with user-definable (and clonable) groups.  A node group
is a collection of nodes that can be instanced.  Users can create input and output sockets 
for the group node. In addition users can pick specific nodes to have their UX appear in 
the group node.

A node socket is a typed directed graph connection.  If unconnected a node socket has a 
default value that is editable by the user, this default value is hidden when connected.
Try to avoid hardcoding node edge cases in if and switch statements.

This will be used in a variety of workflows (e.g. shader graphs, image composition graphs,
procedural generation graphs, etc).

Example skeleton code:

```ts
type GraphId = number | string; // flexible id

class NodeSocketBase<Type extends string = string, Value: any = unknown, PathUxCtx extends IContextBase = whatever> {
	socketId: GraphId
	
	type: Type
	dir: 'in' | 'out'
	value: Value
	defaultValue: Value 
	edges: NodeSocket[]
	
	//true by default for output sockets, false by default for input sockets
	multiSocket: boolean
	isDirty: boolean
	
	// load the coerced value from b.  returns if coercion is possible
	coerce(b: NodeSocket, options?: {dryRun?: boolean}): boolean
	
	// dirty input sockets dirty their owning nodes,
	// while output sockets dirty connected sockets 
	flagDirty()
	clearDirty()
	
	uiName: string
	description: string
	color: color 
	
	copyTo(b: this);
	copy(): this;
	
	// it'd be nice to have full TS typing to the real node's type,
	// but you'd have to be careful not to create a circular ref in 
	// the type system.
	owningNode: Node
	
	//pathux dataapi definition
	static defineAPI(api: DataAPI, st: DataStruct);
	
	// create ux to edit the default value
	createUI(container: Container<PathUxCtx>);
}

type Sockets = {[k: string]: NodeSocket}
// used by nodes that dynamically create sockets at runtime
type DynamicSockets<BuiltinSockets extends Sockets> = BuiltinSockets & {[k: string]: NodeSocket}

interface NodeDef<CTX extends any, Inputs extends Sockets, Outputs extends Sockets> {
	typeName: string
	
	inputs: Inputs 
	outputs: Outputs
	
	uiName: string
	description: string
	color: color 
	
	size: Vector2
	icon: Icons
}

class Node<CTX extends any, Inputs extends Sockets, Outputs extends Sockets> extends NodeDef<CTX, Inputs, Outputs> 
{
	inputs: Inputs 
	outputs: Outputs

	uiName: string
	description: string
	color: color 
	
	exec(ctx: CTX);
	
	dirty: boolean
	graph: Graph<CTX>
	groupInheritsUI: boolean 

	flagDirty(): void;
	
	static defineAPI(api: DataAPI, st: DataStruct);
	createUI(container: Container<PathUxCtx>);
	
	pos: Vector2
	size: Vector2
	
	// note: sockets should merged with node defs in parent classes
	static nodeDef: NodeDef<CTX, Inputs, Outputs>
	
	constructor() {
		// should copy nodeDef (including copying its sockets) into 
		// properties on this 
		// 
	}
}
class Graph<CTX extends any> {
	nodes: Node<CTX>[]
	sortlist: Node<CTX>[]
	sortDirty: boolean 
	
	flagSortDirty(): void;
	flagExecDirty(): void;
}
```

## Serialization 
The graph system should properly support serialization, including:
* Use nstructjs's json mode
* Migration
* Handling nodes with sockets created dynamically at runtime 
* Validating nodes created by llms.

For llm creation of nodes, we can either have it generate nstructjs 
json objects directly or create some kind of simpler DSL.

## Graph

The graph should optionally support cycles, however there will not be a 
cycle solver (instead just a solveWithCycles() method that throws).
Presumably clients with cyclic graphs will provide their own solvers.
The graph will have a simple built-in DAG sorter.

## UX 

Each node can have custom UX.  Nodes can be flagged to have their 
ux put into group instance nodes.  

The editor is a widget 