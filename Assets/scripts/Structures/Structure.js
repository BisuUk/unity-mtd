#pragma strict
#pragma downcast



var canBeAimed : boolean;

@HideInInspector var isAiming : boolean;
@HideInInspector var isSelected : boolean;
// virtual
function SetSelected(selected : boolean)
{ }

// virtual
function Aim()
{ }

function CancelAim()
{ }

// virtual
function Fire()
{ }

