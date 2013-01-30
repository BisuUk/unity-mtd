#pragma strict

var tips : String[];
var cycler : Transform;
var paragraph : UILabel;
var showTips : UICheckbox;


function Start ()
{
   showTips.isChecked = true;
   SetShowCycler(false);
}

function SetShowCycler(show : boolean)
{
   cycler.gameObject.SetActive(show);
}

function ShowTip(index : int)
{
   if (showTips.isChecked)
   {
      paragraph.text = tips[index];
      gameObject.SetActive(true);
   }
}

function OnClose()
{
   gameObject.SetActive(false);
}

