import io,pathlib,tempfile,unittest,zipfile
from unittest.mock import patch
import learning_service as s
class LearningTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.old=(s.DB,s.FILES);s.DB=pathlib.Path(self.temp.name)/'learning.sqlite';s.FILES=pathlib.Path(self.temp.name)/'files'
 def tearDown(self):s.DB,s.FILES=self.old;self.temp.cleanup()
 def pptx(self):
  out=io.BytesIO()
  with zipfile.ZipFile(out,'w') as z:
   z.writestr('[Content_Types].xml','<Types/>');z.writestr('ppt/presentation.xml','<presentation/>');z.writestr('ppt/slides/slide1.xml','<root xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:t>Test slide</a:t></root>')
  return out.getvalue()
 def test_modules_notes_and_deck_task(self):
  self.assertGreater(len(s.list_modules()),120);self.assertTrue(any(m['en']=='FPN' and m['domain']=='cv' for m in s.list_modules()))
  m=s.save_module({'name':'自定义模块','en':'Custom','notes':'my notes','questions':'Q1'})
  with patch.object(s.threading.Thread,'start'):
   d=s.import_deck(m['id'],'my.pptx',self.pptx())
  self.assertEqual(d['texts'],['Test slide']);self.assertEqual(s.detail(m['id'])['decks'][0]['id'],d['id'])
  s.save_deck({'id':d['id'],'notes':'复习笔记','done':True,'page':99})
  self.assertTrue(s.get_deck(d['id'])['done']);self.assertEqual(s.get_deck(d['id'])['page'],0)
  task=s.task_detail('learning-'+d['id']);self.assertEqual(task['project']['kind'],'learning');self.assertEqual(task['task']['id'],'learning-'+d['id'])
  self.assertEqual(s.file_path(d['id'],'source.pptx').read_bytes(),self.pptx())
  s.save_deck({'id':d['id'],'title':'修改后的标题'})
  self.assertEqual(s.get_deck(d['id'])['title'],'修改后的标题')
  s.archive_deck({'id':d['id']})
  self.assertEqual(s.detail(m['id'])['decks'],[]);self.assertEqual(len(s.detail(m['id'])['archivedDecks']),1)
  with self.assertRaises(ValueError):s.task_detail('learning-'+d['id'])
  s.archive_deck({'id':d['id'],'restore':True})
  self.assertEqual(s.detail(m['id'])['decks'][0]['notes'],'复习笔记')
 def test_invalid_files_and_paths(self):
  m=s.list_modules()[0]
  for filename,data in [('bad.pptx',b'not zip'),('bad.ppt',self.pptx())]:
   with self.assertRaises(ValueError):s.import_deck(m['id'],filename,data)
  with self.assertRaises(ValueError):s.file_path('../bad','source.pptx')
  with self.assertRaises(ValueError):s.file_path('00000000-0000-0000-0000-000000000000','../../learning.sqlite')
  with self.assertRaises(ValueError):s.save_module({'name':''})
if __name__=='__main__':unittest.main()
