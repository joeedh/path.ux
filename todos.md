[x]: the 'replace' popup menu should not popup in a mode where 
     pointer up closes the menu.
[x]: default values for sockets should be editable right next to the node 
     sockets they belong to, as is the case with most node editors.
[x]: holding shift and dragging a node should drag all selected nodes, if 
     the node is already selected it should not deselected if it dragged.
[x]: you should be able to select node edges.
[x]: value sockets in the node editor in the example app 
     constantly flash between 0 and the real value.
[x]: the height of nodes occasionally grows 2x then snaps back
[x]: add a delete hotkey in the node editor binding to the delete
     node toolop.
[x]: split scripts/core/ui_base.ts into scripts/core/base/, per
     documentation/plans/ui-base-split-plan.md.
[ ]: thread the Container DataPrefix type parameter through the child
     containers (RowFrame, ColumnFrame, PanelFrame, TwoColumnFrame,
     TableFrame) so con.row().prop(...) keeps prefix autocomplete and
     strict valid-datapath checking. See CLAUDE.md "Data-path prefixes".
[x]: resynchronize setPathValueUndo with the async toolstack
     (regression from 336424c), per documentation/plans/toolsys-tasks.md
     task 0.
[x]: fold DataPathSetOp writes onto the toolstack (foldOrExec), per
     documentation/plans/datapath-set-fold.md.
[ ]: bind tool defaults per DataAPI instead of per process, per
     documentation/plans/toolsys-tasks.md task 2.
[ ]: move ToolClasses/ToolPaths/MacroClasses onto a ToolRegistry with the
     module globals as its default instance, per
     documentation/plans/toolsys-tasks.md task 3.
